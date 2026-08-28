import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import { AppProperties, buildQuery } from "../plugins/googleSheets.js";
import type { SaveQuickWorkoutRequest } from "../types.js";

const QUICK_WORKOUTS_SHEET_NAME = "Gymerr Quick Workouts";

export const createOrGetQuickWorkoutsSheet: RouteHandler = async function (
  request,
  reply,
) {
  const { tokens } = getAuthSession(request);

  try {
    // Check if sheet already exists
    const files = await this.sheets.listFiles(
      tokens,
      buildQuery("quickWorkouts"),
    );

    if (files.length > 0) {
      return {
        spreadsheetId: files[0].id,
        url: `https://docs.google.com/spreadsheets/d/${files[0].id}`,
        created: false,
      };
    }

    // Create new spreadsheet with headers
    const spreadsheetId = await this.sheets.create(
      tokens,
      QUICK_WORKOUTS_SHEET_NAME,
    );

    await this.sheets.setFileProperties(tokens, spreadsheetId, {
      [AppProperties.quickWorkouts.key]: AppProperties.quickWorkouts.value,
    });

    const headers = [
      [
        "Date",
        "WorkoutId",
        "Exercise",
        "Set",
        "Weight",
        "Reps",
        "RIR",
        "Notes",
        "Duration",
      ],
    ];
    await this.sheets.update(tokens, spreadsheetId, "Sheet1!A1", headers);

    return {
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      created: true,
    };
  } catch (error) {
    this.log.error(error);
    return reply
      .status(500)
      .send({ error: "Failed to create quick workouts sheet" });
  }
};

export const getExercises: RouteHandler = async function (request, reply) {
  const { tokens } = getAuthSession(request);

  try {
    // Fetch program and quick workout files in parallel
    const [programFiles, quickWorkoutsFiles] = await Promise.all([
      this.sheets.listFiles(tokens, buildQuery("program")),
      this.sheets.listFiles(tokens, buildQuery("quickWorkouts")),
    ]);

    const exerciseSet = new Set<string>();

    // Fetch all sheets data in parallel
    const fetchPromises: Promise<void>[] = [];

    for (const file of programFiles) {
      fetchPromises.push(
        this.sheets
          .get(tokens, file.id, "Sheet1!D:D")
          .then((data) => {
            if (data) {
              for (const row of data.slice(1)) {
                const exerciseName = String(row[0] || "").trim();
                if (exerciseName) exerciseSet.add(exerciseName);
              }
            }
          })
          .catch(() => {}),
      );
    }

    if (quickWorkoutsFiles.length > 0) {
      fetchPromises.push(
        this.sheets
          .get(tokens, quickWorkoutsFiles[0].id, "Sheet1!C:C")
          .then((data) => {
            if (data) {
              for (const row of data.slice(1)) {
                const exerciseName = String(row[0] || "").trim();
                if (exerciseName) exerciseSet.add(exerciseName);
              }
            }
          })
          .catch(() => {}),
      );
    }

    await Promise.all(fetchPromises);

    return { exercises: Array.from(exerciseSet).sort() };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch exercises" });
  }
};

export const saveQuickWorkout: RouteHandler<{
  Body: SaveQuickWorkoutRequest;
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { workoutId, duration, sets } = request.body;

  if (!workoutId || !sets || sets.length === 0) {
    return reply.status(400).send({ error: "Missing required fields" });
  }

  try {
    // Ensure the quick workouts sheet exists
    const files = await this.sheets.listFiles(
      tokens,
      buildQuery("quickWorkouts"),
    );

    let spreadsheetId: string;
    if (files.length === 0) {
      // Create the sheet
      spreadsheetId = await this.sheets.create(
        tokens,
        QUICK_WORKOUTS_SHEET_NAME,
      );
      await this.sheets.setFileProperties(tokens, spreadsheetId, {
        [AppProperties.quickWorkouts.key]: AppProperties.quickWorkouts.value,
      });
      const headers = [
        [
          "Date",
          "WorkoutId",
          "Exercise",
          "Set",
          "Weight",
          "Reps",
          "RIR",
          "Notes",
          "Duration",
        ],
      ];
      await this.sheets.update(tokens, spreadsheetId, "Sheet1!A1", headers);
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

    await this.sheets.appendRows(tokens, spreadsheetId, "Sheet1!A:I", rows);

    return { success: true, spreadsheetId };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to save quick workout" });
  }
};

export const getWorkoutDetail: RouteHandler<{
  Params: { id: string };
  Querystring: {
    type: string;
    programId?: string;
    date?: string;
    week?: string;
    workout?: string;
  };
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { id } = request.params;
  const { type, programId, date, week, workout } = request.query;

  try {
    interface SetData {
      exercise: string;
      set: number;
      weight: string;
      reps: string;
      rir: string;
      notes: string;
    }

    const sets: SetData[] = [];
    let duration = "";
    let workoutDate = date || "";

    if (type === "quick") {
      // Fetch from quick workouts sheet
      const files = await this.sheets.listFiles(
        tokens,
        buildQuery("quickWorkouts"),
      );
      if (files.length === 0) {
        return reply
          .status(404)
          .send({ error: "Quick workouts sheet not found" });
      }

      const data = await this.sheets.get(tokens, files[0].id, "Sheet1!A:I");
      if (data && data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const workoutId = String(row[1] || "");
          if (workoutId !== id) continue;

          const rowDate = String(row[0] || "");
          const rowDuration = String(row[8] || "");
          if (rowDate) workoutDate = rowDate;
          if (rowDuration) duration = rowDuration;

          sets.push({
            exercise: String(row[2] || ""),
            set: Number(row[3]) || 1,
            weight: String(row[4] || ""),
            reps: String(row[5] || ""),
            rir: String(row[6] || ""),
            notes: String(row[7] || ""),
          });
        }
      }
    } else if (type === "program" && programId && date && week && workout) {
      // Fetch from program sheet
      const data = await this.sheets.get(tokens, programId, "Sheet1!A:J");
      if (data && data.length > 1) {
        let inTargetWorkout = false;
        const isDurationFormat = (str: string) =>
          /^\d{1,2}:\d{2}:\d{2}$/.test(str);

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const rowDateOrDuration = String(row[0] || "");
          const rowWeek = String(row[1] || "");
          const rowWorkout = String(row[2] || "");
          const rowExercise = String(row[3] || "");

          // Check if we're entering the target workout
          if (rowWeek === week && rowWorkout === workout) {
            if (rowDateOrDuration === date || inTargetWorkout) {
              inTargetWorkout = true;

              if (isDurationFormat(rowDateOrDuration)) {
                duration = rowDateOrDuration;
              }

              if (rowExercise) {
                sets.push({
                  exercise: rowExercise,
                  set: Number(row[4]) || 1,
                  weight: String(row[7] || ""),
                  reps: String(row[8] || ""),
                  rir: String(row[9] || ""),
                  notes: "",
                });
              }
            }
          } else if (inTargetWorkout) {
            // We've moved past the target workout
            break;
          }
        }
      }
    } else {
      return reply.status(400).send({ error: "Invalid parameters" });
    }

    // Group sets by exercise
    const exerciseMap = new Map<string, SetData[]>();
    for (const set of sets) {
      if (!exerciseMap.has(set.exercise)) {
        exerciseMap.set(set.exercise, []);
      }
      exerciseMap.get(set.exercise)!.push(set);
    }

    const exercises = Array.from(exerciseMap.entries()).map(([name, sets]) => ({
      name,
      sets: sets.sort((a, b) => a.set - b.set),
    }));

    return {
      date: workoutDate,
      duration,
      exercises,
    };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch workout details" });
  }
};

export const getWorkoutHistory: RouteHandler = async function (request, reply) {
  const { tokens } = getAuthSession(request);

  try {
    type WorkoutEntry = {
      id: string;
      date: string;
      name: string;
      type: "quick" | "program";
      duration?: string;
      exerciseCount: number;
      programId?: string;
      programName?: string;
    };

    const workouts: WorkoutEntry[] = [];

    // Fetch both file lists in parallel
    const [quickFiles, programFiles] = await Promise.all([
      this.sheets.listFiles(tokens, buildQuery("quickWorkouts")),
      this.sheets.listFiles(tokens, buildQuery("program")),
    ]);

    // Fetch all sheet data in parallel
    const fetchPromises: Promise<void>[] = [];

    // Quick workouts
    if (quickFiles.length > 0) {
      fetchPromises.push(
        this.sheets.get(tokens, quickFiles[0].id, "Sheet1!A:I").then((data) => {
          if (data && data.length > 1) {
            const workoutMap = new Map<
              string,
              { date: string; exercises: Set<string>; duration: string }
            >();

            for (let i = 1; i < data.length; i++) {
              const row = data[i];
              const date = String(row[0] || "");
              const workoutId = String(row[1] || "");
              const exercise = String(row[2] || "");
              const duration = String(row[8] || "");

              if (!workoutId) continue;

              if (!workoutMap.has(workoutId)) {
                workoutMap.set(workoutId, {
                  date: date || "",
                  exercises: new Set(),
                  duration: duration || "",
                });
              }

              const workout = workoutMap.get(workoutId)!;
              if (exercise) workout.exercises.add(exercise);
              if (date && !workout.date) workout.date = date;
              if (duration && !workout.duration) workout.duration = duration;
            }

            for (const [id, data] of workoutMap) {
              workouts.push({
                id,
                date: data.date,
                name: "Quick Workout",
                type: "quick",
                duration: data.duration,
                exerciseCount: data.exercises.size,
              });
            }
          }
        }),
      );
    }

    // Helper to detect duration format (H:MM:SS or HH:MM:SS)
    const isDurationFormat = (str: string) => /^\d{1,2}:\d{2}:\d{2}$/.test(str);

    // Program workouts - fetch all in parallel
    for (const file of programFiles) {
      fetchPromises.push(
        this.sheets
          .get(tokens, file.id, "Sheet1!A:D") // Only fetch columns we need
          .then((data) => {
            if (data && data.length > 1) {
              const completedWorkouts = new Map<
                string,
                { date: string; duration: string }
              >();
              const workoutExercises = new Map<string, Set<string>>();

              for (let i = 1; i < data.length; i++) {
                const row = data[i];
                const dateOrDuration = String(row[0] || "");
                const week = String(row[1] || "");
                const workoutName = String(row[2] || "");
                const exercise = String(row[3] || "");

                const key = `${week}|${workoutName}`;

                // Check if this is a date row or duration row
                const isDate =
                  dateOrDuration &&
                  !isDurationFormat(dateOrDuration) &&
                  dateOrDuration.includes("/");
                const isDuration = isDurationFormat(dateOrDuration);

                if (
                  isDate &&
                  week &&
                  workoutName &&
                  !completedWorkouts.has(key)
                ) {
                  completedWorkouts.set(key, {
                    date: dateOrDuration,
                    duration: "",
                  });
                }

                // Check if next row has duration (same week/workout, duration format in date column)
                if (isDuration && completedWorkouts.has(key)) {
                  const workout = completedWorkouts.get(key)!;
                  if (!workout.duration) {
                    workout.duration = dateOrDuration;
                  }
                }

                if (completedWorkouts.has(key) && exercise) {
                  if (!workoutExercises.has(key)) {
                    workoutExercises.set(key, new Set());
                  }
                  workoutExercises.get(key)!.add(exercise);
                }
              }

              for (const [key, data] of completedWorkouts) {
                const [week, workoutName] = key.split("|");
                const exercises = workoutExercises.get(key) || new Set();

                workouts.push({
                  id: `${file.id}|${data.date}|${week}|${workoutName}`,
                  date: data.date,
                  name: workoutName,
                  type: "program",
                  duration: data.duration || undefined,
                  exerciseCount: exercises.size,
                  programId: file.id,
                  programName: file.name,
                });
              }
            }
          })
          .catch(() => {}),
      );
    }

    await Promise.all(fetchPromises);

    // Sort by date (most recent first)
    workouts.sort((a, b) => {
      const parseDate = (d: string) => {
        const [day, month, year] = d.split("/");
        return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
      };
      return parseDate(b.date) - parseDate(a.date);
    });

    return { workouts };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch workout history" });
  }
};
