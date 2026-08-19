import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import crypto from "crypto";
import config from "./config.js";
import googleSheetsPlugin, { type UserInfo } from "./plugins/googleSheets.js";
import type { CreateProgramRequest, UpdateRowsRequest, SaveQuickWorkoutRequest, SaveBodyWeightRequest } from "./types.js";

interface SessionData {
  tokens?: {
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
  };
  user?: UserInfo;
}

// Temporary token store for native app auth (tokens expire after 60 seconds)
const pendingAuthTokens = new Map<
  string,
  { session: SessionData; expires: number }
>();

// Encryption helpers using Node.js built-in crypto
const ENCRYPTION_KEY = crypto.scryptSync(config.env.SESSION_SECRET, "salt", 32);
const IV_LENGTH = 16;

function encrypt(data: SessionData): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data)),
    cipher.final(),
  ]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text: string): SessionData | null {
  try {
    const [ivHex, encryptedHex] = text.split(":");
    if (!ivHex || !encryptedHex) return null;
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString());
  } catch {
    return null;
  }
}

export function buildApp() {
  const fastify = Fastify({
    logger: true,
  });

  // Register cookie plugin
  fastify.register(fastifyCookie, {
    secret: config.env.SESSION_SECRET,
  });

  // Register CORS
  fastify.register(fastifyCors, {
    origin: [
      config.env.FRONTEND_URL,
      "https://gymerr.co",
      "https://www.gymerr.co",
      /\.vercel\.app$/,
      "capacitor://localhost",
      "ionic://localhost",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // Session helpers
  function getSession(request: {
    cookies: Record<string, string | undefined>;
    headers: { authorization?: string | string[] };
  }): SessionData {
    // Check for Authorization header first (native app)
    const authHeader = request.headers.authorization;
    const authValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    if (authValue?.startsWith("Bearer ")) {
      const token = authValue.slice(7);
      return decrypt(token) || {};
    }

    // Fall back to cookie (web)
    const sessionCookie = request.cookies.session;
    if (!sessionCookie) return {};
    return decrypt(sessionCookie) || {};
  }

  function setSession(
    reply: {
      setCookie: (name: string, value: string, options: object) => void;
    },
    data: SessionData,
  ) {
    const isProduction = process.env.NODE_ENV === "production";
    reply.setCookie("session", encrypt(data), {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }

  function clearSession(reply: {
    clearCookie: (name: string, options: object) => void;
  }) {
    reply.clearCookie("session", { path: "/" });
  }

  // Register plugins
  fastify.register(googleSheetsPlugin);

  // API routes
  fastify.get("/api/health", async () => {
    return { status: "ok" };
  });

  // Google OAuth routes
  fastify.get("/auth/google", async (request, reply) => {
    const { native } = request.query as { native?: string };
    const state = native === "true" ? "native" : "web";
    const authUrl = fastify.sheets.getAuthUrl(state);
    return reply.redirect(authUrl);
  });

  fastify.get("/auth/google/callback", async (request, reply) => {
    const { code, state } = request.query as { code: string; state?: string };
    if (!code) {
      return reply.status(400).send({ error: "Missing code parameter" });
    }

    // For native app, pass code directly - app will exchange it
    if (state === "native") {
      return reply.redirect(
        `gymerr://auth/callback?code=${encodeURIComponent(code)}`,
      );
    }

    // For web, exchange code here
    try {
      const { tokens, user } = await fastify.sheets.handleCallback(code);
      setSession(reply, { tokens, user });
      return reply.redirect(config.env.FRONTEND_URL);
    } catch (error) {
      fastify.log.error(error);
      return reply.redirect(
        `${config.env.FRONTEND_URL}/login?error=auth_failed`,
      );
    }
  });

  fastify.get("/api/auth/google/status", async (request) => {
    const session = getSession(request);
    return {
      authenticated: !!session.tokens,
      user: session.user || null,
    };
  });

  fastify.post("/api/auth/logout", async (_request, reply) => {
    clearSession(reply);
    return { success: true };
  });

  // Native app: exchange auth code for session token
  fastify.post<{ Body: { code: string } }>(
    "/api/auth/google/native",
    async (request, reply) => {
      const { code } = request.body;

      if (!code) {
        return reply.status(400).send({ error: "Missing auth code" });
      }

      try {
        // Use the same method as web callback - gets tokens AND user info
        const { tokens, user } = await fastify.sheets.handleCallback(code);
        const sessionToken = encrypt({ tokens, user });

        return { success: true, user, sessionToken };
      } catch (error) {
        fastify.log.error(error);
        return reply
          .status(500)
          .send({ error: "Failed to exchange auth code" });
      }
    },
  );

  // Program routes
  fastify.post<{ Body: CreateProgramRequest }>(
    "/api/program/create",
    async (request, reply) => {
      const session = getSession(request);
      if (!session.tokens) {
        return reply.status(401).send({ error: "Not authenticated" });
      }

      const { name, durationWeeks, dynamicRir, startingRir, workouts } =
        request.body;

      const headers = [
        "Date",
        "Week",
        "Workout",
        "Exercise",
        "Set",
        "Target Reps",
        "RIR",
        "Weight",
        "Reps Achieved",
        "RIR Achieved",
        "Notes",
      ];
      const rows: (string | number)[][] = [headers];

      for (let week = 1; week <= durationWeeks; week++) {
        let weekRir = startingRir;
        if (dynamicRir && durationWeeks > 1) {
          const rirDecrement = startingRir / (durationWeeks - 1);
          weekRir = Math.max(
            0,
            Math.round(startingRir - rirDecrement * (week - 1)),
          );
        }

        for (const workout of workouts) {
          for (const exercise of workout.exercises) {
            const targetRir = dynamicRir ? weekRir : exercise.rir;
            const rirDisplay =
              targetRir === 0 ? "To Failure" : targetRir.toString();

            for (let set = 1; set <= exercise.sets; set++) {
              rows.push([
                "",
                week,
                workout.name,
                exercise.name,
                set,
                exercise.reps,
                rirDisplay,
                "",
                "",
                "",
                "",
              ]);
            }
          }
        }
      }

      try {
        const spreadsheetId = await fastify.sheets.createSpreadsheet(
          session.tokens,
          name,
        );
        await fastify.sheets.setFileProperties(session.tokens, spreadsheetId, {
          createdBy: "gymerr",
        });
        await fastify.sheets.update(
          session.tokens,
          spreadsheetId,
          "Sheet1!A1",
          rows,
        );

        return {
          success: true,
          spreadsheetId,
          url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        };
      } catch (error) {
        fastify.log.error(error);
        return reply
          .status(500)
          .send({ error: "Failed to create spreadsheet" });
      }
    },
  );

  fastify.get("/api/programs", async (request, reply) => {
    const session = getSession(request);
    if (!session.tokens) {
      return reply.status(401).send({ error: "Not authenticated" });
    }

    try {
      const query =
        "mimeType='application/vnd.google-apps.spreadsheet' and appProperties has { key='createdBy' and value='gymerr' } and trashed=false";
      const files = await fastify.sheets.listFiles(session.tokens, query);
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

  fastify.get<{ Params: { id: string } }>(
    "/api/programs/:id",
    async (request, reply) => {
      const session = getSession(request);
      if (!session.tokens) {
        return reply.status(401).send({ error: "Not authenticated" });
      }

      const { id } = request.params;

      try {
        const [data, programName] = await Promise.all([
          fastify.sheets.get(session.tokens, id, "Sheet1!A:K"),
          fastify.sheets.getFileName(session.tokens, id),
        ]);

        console.log(data);

        if (!data || data.length < 2) {
          return reply
            .status(404)
            .send({ error: "Program not found or empty" });
        }

        const rows = data.slice(1).map((row, index) => ({
          rowIndex: index + 2,
          date: String(row[0] || ""),
          week: Number(row[1]) || 0,
          workout: String(row[2] || ""),
          exercise: String(row[3] || ""),
          set: Number(row[4]) || 0,
          targetReps: Number(row[5]) || 0,
          rir: String(row[6] || ""),
          weight: String(row[7] || ""),
          repsAchieved: String(row[8] || ""),
          rirAchieved: String(row[9] || ""),
          notes: String(row[10] || ""),
        }));

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

        // Helper to detect duration format (H:MM:SS or HH:MM:SS)
        const isDurationFormat = (str: string) =>
          /^\d{1,2}:\d{2}:\d{2}$/.test(str);

        const program = Array.from(weeks.entries()).map(
          ([weekNum, workouts]) => ({
            week: weekNum,
            workouts: Array.from(workouts.entries()).map(
              ([name, exercises]) => {
                const completedDate = exercises[0]?.date || "";
                // Duration is stored in the second row's date column
                const secondRowDate = exercises[1]?.date || "";
                const duration = isDurationFormat(secondRowDate)
                  ? secondRowDate
                  : "";

                return {
                  name,
                  exercises,
                  isComplete: exercises.every((e) => e.repsAchieved !== ""),
                  completedDate,
                  duration,
                };
              },
            ),
          }),
        );

        return { program, name: programName };
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to fetch program" });
      }
    },
  );

  fastify.patch<{ Params: { id: string }; Body: UpdateRowsRequest }>(
    "/api/programs/:id/rows",
    async (request, reply) => {
      const session = getSession(request);
      if (!session.tokens) {
        return reply.status(401).send({ error: "Not authenticated" });
      }

      const { id } = request.params;
      const { updates, completedDate, dateRowIndex, duration } = request.body;

      try {
        const data = updates.map((update) => ({
          range: `Sheet1!H${update.rowIndex}:K${update.rowIndex}`,
          values: [
            [
              update.weight,
              update.repsAchieved,
              update.rirAchieved,
              update.notes,
            ],
          ],
        }));

        if (completedDate && dateRowIndex) {
          data.push({
            range: `Sheet1!A${dateRowIndex}`,
            values: [[completedDate]],
          });

          // Write duration one row below the date
          if (duration) {
            data.push({
              range: `Sheet1!A${dateRowIndex + 1}`,
              values: [[duration]],
            });
          }
        }

        await fastify.sheets.batchUpdate(session.tokens, id, data);
        return { success: true };
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to update program" });
      }
    },
  );

  // Quick Workout routes
  const QUICK_WORKOUTS_SHEET_NAME = "Gymerr Quick Workouts";

  // Create or get the quick workouts spreadsheet
  fastify.post("/api/quick-workouts", async (request, reply) => {
    const session = getSession(request);
    if (!session.tokens) {
      return reply.status(401).send({ error: "Not authenticated" });
    }

    try {
      // Check if sheet already exists
      const query =
        "mimeType='application/vnd.google-apps.spreadsheet' and appProperties has { key='gymerrQuickWorkouts' and value='true' } and trashed=false";
      const files = await fastify.sheets.listFiles(session.tokens, query);

      if (files.length > 0) {
        return {
          spreadsheetId: files[0].id,
          url: `https://docs.google.com/spreadsheets/d/${files[0].id}`,
          created: false,
        };
      }

      // Create new spreadsheet with headers
      const spreadsheetId = await fastify.sheets.createSpreadsheet(
        session.tokens,
        QUICK_WORKOUTS_SHEET_NAME,
      );

      await fastify.sheets.setFileProperties(session.tokens, spreadsheetId, {
        gymerrQuickWorkouts: "true",
      });

      const headers = [
        ["Date", "WorkoutId", "Exercise", "Set", "Weight", "Reps", "RIR", "Notes", "Duration"],
      ];
      await fastify.sheets.update(
        session.tokens,
        spreadsheetId,
        "Sheet1!A1",
        headers,
      );

      return {
        spreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        created: true,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply
        .status(500)
        .send({ error: "Failed to create quick workouts sheet" });
    }
  });

  // Get unique exercise names from all program sheets for autocomplete
  fastify.get("/api/quick-workouts/exercises", async (request, reply) => {
    const session = getSession(request);
    if (!session.tokens) {
      return reply.status(401).send({ error: "Not authenticated" });
    }

    try {
      // Get all program spreadsheets
      const query =
        "mimeType='application/vnd.google-apps.spreadsheet' and appProperties has { key='createdBy' and value='gymerr' } and trashed=false";
      const files = await fastify.sheets.listFiles(session.tokens, query);

      const exerciseSet = new Set<string>();

      // Fetch exercise names from each spreadsheet
      for (const file of files) {
        try {
          const data = await fastify.sheets.get(
            session.tokens,
            file.id,
            "Sheet1!D:D", // Exercise column
          );
          if (data) {
            for (const row of data.slice(1)) {
              // Skip header
              const exerciseName = String(row[0] || "").trim();
              if (exerciseName) {
                exerciseSet.add(exerciseName);
              }
            }
          }
        } catch (err) {
          // Skip individual sheet errors
          fastify.log.warn(`Failed to read exercises from ${file.name}: ${err}`);
        }
      }

      // Also check quick workouts sheet for exercises
      const quickWorkoutsQuery =
        "mimeType='application/vnd.google-apps.spreadsheet' and appProperties has { key='gymerrQuickWorkouts' and value='true' } and trashed=false";
      const quickWorkoutsFiles = await fastify.sheets.listFiles(
        session.tokens,
        quickWorkoutsQuery,
      );

      if (quickWorkoutsFiles.length > 0) {
        try {
          const data = await fastify.sheets.get(
            session.tokens,
            quickWorkoutsFiles[0].id,
            "Sheet1!C:C", // Exercise column in quick workouts
          );
          if (data) {
            for (const row of data.slice(1)) {
              const exerciseName = String(row[0] || "").trim();
              if (exerciseName) {
                exerciseSet.add(exerciseName);
              }
            }
          }
        } catch (err) {
          fastify.log.warn(`Failed to read exercises from quick workouts: ${err}`);
        }
      }

      return { exercises: Array.from(exerciseSet).sort() };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch exercises" });
    }
  });

  // Save a completed quick workout
  fastify.post<{ Body: SaveQuickWorkoutRequest }>(
    "/api/quick-workouts/save",
    async (request, reply) => {
      const session = getSession(request);
      if (!session.tokens) {
        return reply.status(401).send({ error: "Not authenticated" });
      }

      const { workoutId, duration, sets } = request.body;

      if (!workoutId || !sets || sets.length === 0) {
        return reply.status(400).send({ error: "Missing required fields" });
      }

      try {
        // Ensure the quick workouts sheet exists
        const query =
          "mimeType='application/vnd.google-apps.spreadsheet' and appProperties has { key='gymerrQuickWorkouts' and value='true' } and trashed=false";
        const files = await fastify.sheets.listFiles(session.tokens, query);

        let spreadsheetId: string;
        if (files.length === 0) {
          // Create the sheet
          spreadsheetId = await fastify.sheets.createSpreadsheet(
            session.tokens,
            QUICK_WORKOUTS_SHEET_NAME,
          );
          await fastify.sheets.setFileProperties(session.tokens, spreadsheetId, {
            gymerrQuickWorkouts: "true",
          });
          const headers = [
            ["Date", "WorkoutId", "Exercise", "Set", "Weight", "Reps", "RIR", "Notes", "Duration"],
          ];
          await fastify.sheets.update(
            session.tokens,
            spreadsheetId,
            "Sheet1!A1",
            headers,
          );
        } else {
          spreadsheetId = files[0].id;
        }

        // Format date as DD/MM/YYYY
        const today = new Date();
        const dateStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

        // Build rows to append
        const rows: (string | number)[][] = sets.map((set, index) => [
          index === 0 ? dateStr : "", // Date only on first row
          workoutId,
          set.exercise,
          set.set,
          set.weight,
          set.reps,
          set.rir,
          set.notes,
          index === 0 ? duration : "", // Duration only on first row
        ]);

        await fastify.sheets.appendRows(
          session.tokens,
          spreadsheetId,
          "Sheet1!A:I",
          rows,
        );

        return { success: true, spreadsheetId };
      } catch (error) {
        fastify.log.error(error);
        return reply
          .status(500)
          .send({ error: "Failed to save quick workout" });
      }
    },
  );

  // Body Weight Tracking
  const BODY_WEIGHT_SHEET_NAME = "Gymerr Body Weight";

  // Get recent body weight entries
  fastify.get("/api/body-weight", async (request, reply) => {
    const session = getSession(request);
    if (!session.tokens) {
      return reply.status(401).send({ error: "Not authenticated" });
    }

    try {
      const query =
        "mimeType='application/vnd.google-apps.spreadsheet' and appProperties has { key='gymerrBodyWeight' and value='true' } and trashed=false";
      const files = await fastify.sheets.listFiles(session.tokens, query);

      if (files.length === 0) {
        return { entries: [], spreadsheetId: null };
      }

      const spreadsheetId = files[0].id;
      const data = await fastify.sheets.get(
        session.tokens,
        spreadsheetId,
        "Sheet1!A:B",
      );

      if (!data || data.length < 2) {
        return { entries: [], spreadsheetId };
      }

      // Get last 30 entries (most recent first)
      const entries = data
        .slice(1)
        .filter((row) => row[0] && row[1])
        .map((row) => ({
          date: String(row[0]),
          weight: String(row[1]),
        }))
        .reverse()
        .slice(0, 30);

      return { entries, spreadsheetId };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch body weight" });
    }
  });

  // Save body weight entry
  fastify.post<{ Body: SaveBodyWeightRequest }>(
    "/api/body-weight",
    async (request, reply) => {
      const session = getSession(request);
      if (!session.tokens) {
        return reply.status(401).send({ error: "Not authenticated" });
      }

      const { weight } = request.body;

      if (!weight) {
        return reply.status(400).send({ error: "Weight is required" });
      }

      try {
        // Find or create the body weight sheet
        const query =
          "mimeType='application/vnd.google-apps.spreadsheet' and appProperties has { key='gymerrBodyWeight' and value='true' } and trashed=false";
        const files = await fastify.sheets.listFiles(session.tokens, query);

        let spreadsheetId: string;
        if (files.length === 0) {
          // Create the sheet
          spreadsheetId = await fastify.sheets.createSpreadsheet(
            session.tokens,
            BODY_WEIGHT_SHEET_NAME,
          );
          await fastify.sheets.setFileProperties(session.tokens, spreadsheetId, {
            gymerrBodyWeight: "true",
          });
          const headers = [["Date", "Weight"]];
          await fastify.sheets.update(
            session.tokens,
            spreadsheetId,
            "Sheet1!A1",
            headers,
          );
        } else {
          spreadsheetId = files[0].id;
        }

        // Format date as DD/MM/YYYY
        const today = new Date();
        const dateStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

        // Append the weight entry
        await fastify.sheets.appendRows(
          session.tokens,
          spreadsheetId,
          "Sheet1!A:B",
          [[dateStr, weight]],
        );

        return { success: true, date: dateStr, weight };
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to save body weight" });
      }
    },
  );

  return fastify;
}
