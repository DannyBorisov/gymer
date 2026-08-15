import Fastify from "fastify";
import fastifySecureSession from "@fastify/secure-session";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import config from "./config.js";
import googleSheetsPlugin, { type UserInfo } from "./plugins/googleSheets.js";

interface SessionData {
  tokens?: {
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
  };
  user?: UserInfo;
}

declare module "@fastify/secure-session" {
  interface SessionData {
    tokens?: {
      access_token: string;
      refresh_token?: string;
      expiry_date?: number;
    };
    user?: UserInfo;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: true,
});

// Register secure session (cookie-based, persists across server restarts)
fastify.register(fastifySecureSession, {
  key: Buffer.from(config.env.SESSION_SECRET.padEnd(32, "0").slice(0, 32)),
  cookie: {
    path: "/",
    httpOnly: true,
    secure: false,
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  },
});

// Register plugins
fastify.register(googleSheetsPlugin);

// Serve static files from the React build folder
fastify.register(fastifyStatic, {
  root: path.join(__dirname, "../frontend/dist"),
  prefix: "/",
});

// API routes
fastify.get("/api/health", async () => {
  return { status: "ok" };
});

// Google OAuth routes
fastify.get("/auth/google", async (_request, reply) => {
  const authUrl = fastify.sheets.getAuthUrl();
  return reply.redirect(authUrl);
});

fastify.get("/auth/google/callback", async (request, reply) => {
  const { code } = request.query as { code: string };
  if (!code) {
    return reply.status(400).send({ error: "Missing code parameter" });
  }

  try {
    const { tokens, user } = await fastify.sheets.handleCallback(code);
    request.session.set("tokens", tokens);
    request.session.set("user", user);
    return reply.redirect("/");
  } catch (error) {
    fastify.log.error(error);
    return reply.redirect("/login?error=auth_failed");
  }
});

fastify.get("/api/auth/google/status", async (request) => {
  return {
    authenticated: !!request.session.get("tokens"),
    user: request.session.get("user") || null,
  };
});

fastify.post("/api/auth/logout", async (request) => {
  request.session.delete();
  return { success: true };
});

// Program routes
interface Exercise {
  name: string;
  sets: number;
  reps: number;
  rir: number;
}

interface Workout {
  name: string;
  exercises: Exercise[];
}

interface CreateProgramBody {
  name: string;
  durationWeeks: number;
  frequency: number | "every-other-day";
  dynamicRir: boolean;
  startingRir: number;
  workouts: Workout[];
}

fastify.post<{ Body: CreateProgramBody }>("/api/program/create", async (request, reply) => {
  const tokens = request.session.get("tokens");
  if (!tokens) {
    return reply.status(401).send({ error: "Not authenticated" });
  }

  const { name, durationWeeks, dynamicRir, startingRir, workouts } = request.body;

  // Build spreadsheet rows
  const headers = ["Week", "Workout", "Exercise", "Set", "Target Reps", "RIR", "Weight", "Reps Achieved", "Notes"];
  const rows: (string | number)[][] = [headers];

  for (let week = 1; week <= durationWeeks; week++) {
    // Calculate RIR for this week if dynamic
    let weekRir = startingRir;
    if (dynamicRir && durationWeeks > 1) {
      // Linearly decrease RIR from startingRir to 0 over the program duration
      const rirDecrement = startingRir / (durationWeeks - 1);
      weekRir = Math.max(0, Math.round(startingRir - rirDecrement * (week - 1)));
    }

    for (const workout of workouts) {
      for (const exercise of workout.exercises) {
        // Use exercise-specific RIR or calculated week RIR
        const targetRir = dynamicRir ? weekRir : exercise.rir;
        const rirDisplay = targetRir === 0 ? "To Failure" : targetRir.toString();

        for (let set = 1; set <= exercise.sets; set++) {
          rows.push([
            week,
            workout.name,
            exercise.name,
            set,
            exercise.reps,
            rirDisplay,
            "", // Weight - user fills in
            "", // Reps Achieved - user fills in
            "", // Notes - user fills in
          ]);
        }
      }
    }
  }

  try {
    const spreadsheetId = await fastify.sheets.createSpreadsheet(tokens, name);
    await fastify.sheets.setFileProperties(tokens, spreadsheetId, { createdBy: "gymerr" });
    await fastify.sheets.update(tokens, spreadsheetId, "Sheet1!A1", rows);

    return {
      success: true,
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to create spreadsheet" });
  }
});

fastify.get("/api/programs", async (request, reply) => {
  const tokens = request.session.get("tokens");
  if (!tokens) {
    return reply.status(401).send({ error: "Not authenticated" });
  }

  try {
    const query = "mimeType='application/vnd.google-apps.spreadsheet' and appProperties has { key='createdBy' and value='gymerr' } and trashed=false";
    const files = await fastify.sheets.listFiles(tokens, query);
    const programs = files.map((file) => ({
      ...file,
      url: `https://docs.google.com/spreadsheets/d/${file.id}`,
    }));
    return { programs };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch programs" });
  }
});

fastify.get<{ Params: { id: string } }>("/api/programs/:id", async (request, reply) => {
  const tokens = request.session.get("tokens");
  if (!tokens) {
    return reply.status(401).send({ error: "Not authenticated" });
  }

  const { id } = request.params;

  try {
    const data = await fastify.sheets.get(tokens, id, "Sheet1!A:I");
    if (!data || data.length < 2) {
      return reply.status(404).send({ error: "Program not found or empty" });
    }

    // Parse spreadsheet data into structured format
    // Headers: Week, Workout, Exercise, Set, Target Reps, RIR, Weight, Reps Achieved, Notes
    const rows = data.slice(1).map((row, index) => ({
      rowIndex: index + 2, // 1-indexed, skip header
      week: Number(row[0]) || 0,
      workout: String(row[1] || ""),
      exercise: String(row[2] || ""),
      set: Number(row[3]) || 0,
      targetReps: Number(row[4]) || 0,
      rir: String(row[5] || ""),
      weight: String(row[6] || ""),
      repsAchieved: String(row[7] || ""),
      notes: String(row[8] || ""),
    }));

    // Group by week and workout
    const weeks = new Map<number, Map<string, typeof rows>>();
    for (const row of rows) {
      if (!weeks.has(row.week)) {
        weeks.set(row.week, new Map());
      }
      const workouts = weeks.get(row.week)!;
      if (!workouts.has(row.workout)) {
        workouts.set(row.workout, []);
      }
      workouts.get(row.workout)!.push(row);
    }

    // Convert to array structure
    const program = Array.from(weeks.entries()).map(([weekNum, workouts]) => ({
      week: weekNum,
      workouts: Array.from(workouts.entries()).map(([name, exercises]) => ({
        name,
        exercises,
        isComplete: exercises.every((e) => e.repsAchieved !== ""),
      })),
    }));

    return { program };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch program" });
  }
});

interface UpdateRowsBody {
  updates: { rowIndex: number; weight: string; repsAchieved: string; notes: string }[];
}

fastify.patch<{ Params: { id: string }; Body: UpdateRowsBody }>("/api/programs/:id/rows", async (request, reply) => {
  const tokens = request.session.get("tokens");
  if (!tokens) {
    return reply.status(401).send({ error: "Not authenticated" });
  }

  const { id } = request.params;
  const { updates } = request.body;

  try {
    // Batch update the cells - columns G (Weight), H (Reps Achieved), I (Notes)
    const data = updates.map((update) => ({
      range: `Sheet1!G${update.rowIndex}:I${update.rowIndex}`,
      values: [[update.weight, update.repsAchieved, update.notes]],
    }));

    await fastify.sheets.batchUpdate(tokens, id, data);
    return { success: true };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to update program" });
  }
});

// Fallback to index.html for client-side routing
fastify.setNotFoundHandler(async (_request, reply) => {
  return reply.sendFile("index.html");
});

const start = async () => {
  try {
    await fastify.listen({ port: config.env.PORT, host: "0.0.0.0" });
    console.log(`Server running on http://localhost:${config.env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
