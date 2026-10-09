import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import { FirebaseStorage } from "../dal/firebase/FirebaseStorage.js";
import { ProgramSchema } from "../dal/gsql/schemas/program.js";
import { QuickWorkoutSchema } from "../dal/gsql/schemas/quickWorkout.js";
import { BodyWeightSchema } from "../dal/gsql/schemas/bodyWeight.js";
import { ExerciseSchema } from "../dal/gsql/schemas/exercise.js";

const BASE_QUERY =
  "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";

// Identify sheet type by name
function identifySheetType(name: string): "program" | "quickWorkouts" | "bodyWeight" | "exercises" | "unknown" {
  const lower = name.toLowerCase();
  if (lower.includes("quick workout") || lower === "ikkos quick workouts") {
    return "quickWorkouts";
  }
  if (lower.includes("body weight") || lower === "ikkos body weight") {
    return "bodyWeight";
  }
  if (lower.includes("exercise") || lower === "ikkos exercises") {
    return "exercises";
  }
  // Assume anything else is a program
  return "program";
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Migrate Google Sheets to Firebase Storage
 * Identifies sheet type by name
 */
export const migrateToFirebase: RouteHandler = async function (request, reply) {
  const session = getAuthSession(request);
  const userEmail = session.user?.email;

  if (!userEmail) {
    return reply.status(401).send({ error: "User email required" });
  }

  const tokens = session.tokens;
  const storage = new FirebaseStorage();
  const results: { name: string; id: string; type: string; status: string; rows?: number }[] = [];

  try {
    // Get ALL spreadsheets
    console.log(`[migrate] Fetching sheets for ${userEmail} with query: ${BASE_QUERY}`);
    const allSheets = await this.sheets.listFiles(tokens, BASE_QUERY);
    console.log(`[migrate] Found ${allSheets.length} total sheets:`, allSheets.map(s => s.name));
    this.log.info(`[migrate] Found ${allSheets.length} total sheets for ${userEmail}`);

    for (const sheet of allSheets) {
      const sheetType = identifySheetType(sheet.name);
      console.log(`[migrate] Processing sheet: "${sheet.name}" -> type: ${sheetType}`);

      try {
        let targetId: string;
        let appProperties: Record<string, string>;

        switch (sheetType) {
          case "quickWorkouts":
            targetId = "ikkos-quick-workouts";
            appProperties = { [QuickWorkoutSchema.appProperty.key]: QuickWorkoutSchema.appProperty.value };
            break;
          case "bodyWeight":
            targetId = "ikkos-body-weight";
            appProperties = { [BodyWeightSchema.appProperty.key]: BodyWeightSchema.appProperty.value };
            break;
          case "exercises":
            targetId = "ikkos-exercises";
            appProperties = { [ExerciseSchema.appProperty.key]: ExerciseSchema.appProperty.value };
            break;
          case "program":
            targetId = slugify(sheet.name);
            appProperties = { [ProgramSchema.appProperty.key]: ProgramSchema.appProperty.value };
            break;
          default:
            console.log(`[migrate] Skipping unknown type: ${sheet.name}`);
            results.push({ name: sheet.name, id: sheet.id, type: sheetType, status: "skipped (unknown type)" });
            continue;
        }

        console.log(`[migrate] Target ID: ${targetId}`);

        // Read from Google Sheets
        const data = await this.sheets.get(tokens, sheet.id, "A:Z");
        if (!data || data.length === 0) {
          results.push({ name: sheet.name, id: targetId, type: sheetType, status: "skipped (empty)" });
          continue;
        }

        // Write to Firebase Storage
        await storage.set(userEmail, targetId, data);

        // Add to index
        await storage.addToIndex(userEmail, {
          id: targetId,
          name: sheet.name,
          createdTime: sheet.createdTime,
          appProperties,
        });

        const existed = await storage.exists(userEmail, targetId);
        results.push({ name: sheet.name, id: targetId, type: sheetType, status: existed ? "updated" : "migrated", rows: data.length });
        this.log.info(`[migrate] ${existed ? "Updated" : "Migrated"} ${sheetType}: ${sheet.name} (${data.length} rows)`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.push({ name: sheet.name, id: sheet.id, type: sheetType, status: `error: ${message}` });
        this.log.error(`[migrate] Failed to migrate ${sheet.name}: ${message}`);
      }
    }

    const migrated = results.filter((r) => r.status === "migrated").length;
    const skipped = results.filter((r) => r.status.startsWith("skipped")).length;
    const errors = results.filter((r) => r.status.startsWith("error")).length;

    return {
      success: true,
      summary: { migrated, skipped, errors, total: results.length },
      results,
    };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Migration failed" });
  }
};
