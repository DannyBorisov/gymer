import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import { AppProperties, buildQuery } from "../plugins/googleSheets.js";

export interface ExerciseProgressionEntry {
  date: string;
  weight: number;
  reps: number;
  sets: number;
  e1rm: number;
}

export interface ExerciseProgression {
  exercise: string;
  entries: ExerciseProgressionEntry[];
}

export interface ExerciseBest {
  weight: number;
  reps: number;
  e1rm: number;
}

// Calculate estimated 1RM using Epley formula
const calculateE1RM = (weight: number, reps: number): number => {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
};

// Get the best estimated 1RM for each exercise across all workouts
export const getExerciseBests: RouteHandler = async function (request, reply) {
  const { tokens } = getAuthSession(request);

  try {
    const exerciseBests = new Map<string, ExerciseBest>();

    // Fetch program and quick workout files in parallel
    const [programFiles, quickWorkoutsFiles] = await Promise.all([
      this.sheets.listFiles(tokens, buildQuery("program")),
      this.sheets.listFiles(tokens, buildQuery("quickWorkouts")),
    ]);

    const fetchPromises: Promise<void>[] = [];

    // Fetch from program sheets
    // Columns: A=Date, B=Week, C=Workout, D=Exercise, E=Set, F=TargetReps, G=RIR, H=Weight, I=RepsAchieved
    for (const file of programFiles) {
      fetchPromises.push(
        this.sheets
          .get(tokens, file.id, "Sheet1!A:I")
          .then((data) => {
            if (data && data.length > 1) {
              for (let i = 1; i < data.length; i++) {
                const row = data[i];
                const exercise = String(row[3] || "").trim();
                const weightStr = String(row[7] || "").trim();
                const repsStr = String(row[8] || "").trim();

                if (!exercise || weightStr === "" || repsStr === "") continue;

                const weight = parseFloat(weightStr) || 0;
                const reps = parseInt(repsStr, 10) || 0;
                const e1rm = calculateE1RM(weight, reps);

                if (e1rm > 0) {
                  const existing = exerciseBests.get(exercise);
                  if (!existing || e1rm > existing.e1rm) {
                    exerciseBests.set(exercise, { weight, reps, e1rm });
                  }
                }
              }
            }
          })
          .catch(() => {}),
      );
    }

    // Fetch from quick workouts sheet
    // Columns: A=Date, B=WorkoutId, C=Exercise, D=Set, E=Weight, F=Reps
    if (quickWorkoutsFiles.length > 0) {
      fetchPromises.push(
        this.sheets
          .get(tokens, quickWorkoutsFiles[0].id, "Sheet1!A:F")
          .then((data) => {
            if (data && data.length > 1) {
              for (let i = 1; i < data.length; i++) {
                const row = data[i];
                const exercise = String(row[2] || "").trim();
                const weightStr = String(row[4] || "").trim();
                const repsStr = String(row[5] || "").trim();

                if (!exercise || weightStr === "" || repsStr === "") continue;

                const weight = parseFloat(weightStr) || 0;
                const reps = parseInt(repsStr, 10) || 0;
                const e1rm = calculateE1RM(weight, reps);

                if (e1rm > 0) {
                  const existing = exerciseBests.get(exercise);
                  if (!existing || e1rm > existing.e1rm) {
                    exerciseBests.set(exercise, { weight, reps, e1rm });
                  }
                }
              }
            }
          })
          .catch(() => {}),
      );
    }

    await Promise.all(fetchPromises);

    // Convert to object
    const bests: Record<string, ExerciseBest> = {};
    for (const [exercise, best] of exerciseBests) {
      bests[exercise] = {
        weight: Math.round(best.weight * 100) / 100,
        reps: best.reps,
        e1rm: Math.round(best.e1rm * 100) / 100,
      };
    }

    return { bests };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch exercise bests" });
  }
};

export const getExerciseProgression: RouteHandler = async function (
  request,
  reply,
) {
  const { tokens } = getAuthSession(request);

  try {
    const exerciseMap = new Map<
      string,
      Map<string, { totalWeight: number; totalReps: number; sets: number }>
    >();

    // Fetch program and quick workout files in parallel
    const [programFiles, quickWorkoutsFiles] = await Promise.all([
      this.sheets.listFiles(tokens, buildQuery("program")),
      this.sheets.listFiles(tokens, buildQuery("quickWorkouts")),
    ]);

    const fetchPromises: Promise<void>[] = [];

    // Fetch from program sheets
    // Columns: A=Date, B=Week, C=Workout, D=Exercise, E=Set, F=TargetReps, G=RIR, H=Weight, I=RepsAchieved
    for (const file of programFiles) {
      fetchPromises.push(
        this.sheets
          .get(tokens, file.id, "Sheet1!A:I")
          .then((data) => {
            if (data && data.length > 1) {
              // Track the current workout's date (first row of each workout group has the date)
              let currentWorkoutDate = "";
              let currentWorkout = "";

              for (let i = 1; i < data.length; i++) {
                const row = data[i];
                const dateCell = String(row[0] || "").trim();
                const workout = String(row[2] || "").trim();
                const exercise = String(row[3] || "").trim();
                const weightStr = String(row[7] || "").trim();
                const repsStr = String(row[8] || "").trim();

                // Check if this is a date (DD/MM/YYYY or DD/MM/YYYY, HH:MM format) vs duration (H:MM:SS)
                const isDate = /^\d{1,2}\/\d{1,2}\/\d{4}(, \d{2}:\d{2})?$/.test(dateCell);
                if (isDate) {
                  currentWorkoutDate = dateCell;
                  currentWorkout = workout;
                } else if (workout !== currentWorkout) {
                  // New workout without date means it's not completed
                  currentWorkoutDate = "";
                  currentWorkout = workout;
                }

                // Skip if no date, no exercise, or no weight/reps data entered
                if (!currentWorkoutDate || !exercise) continue;
                if (weightStr === "" || repsStr === "") continue;

                const weight = parseFloat(weightStr) || 0;
                const reps = parseInt(repsStr, 10) || 0;

                if (!exerciseMap.has(exercise)) {
                  exerciseMap.set(exercise, new Map());
                }

                const dateMap = exerciseMap.get(exercise)!;
                if (!dateMap.has(currentWorkoutDate)) {
                  dateMap.set(currentWorkoutDate, {
                    totalWeight: 0,
                    totalReps: 0,
                    sets: 0,
                  });
                }

                const entry = dateMap.get(currentWorkoutDate)!;
                entry.totalWeight += weight;
                entry.totalReps += reps;
                entry.sets += 1;
              }
            }
          })
          .catch(() => {
            // Silently skip failed fetches (e.g., deleted files)
          }),
      );
    }

    // Fetch from quick workouts sheet
    // Columns: A=Date, B=WorkoutId, C=Exercise, D=Set, E=Weight, F=Reps
    if (quickWorkoutsFiles.length > 0) {
      fetchPromises.push(
        this.sheets
          .get(tokens, quickWorkoutsFiles[0].id, "Sheet1!A:F")
          .then((data) => {
            if (data && data.length > 1) {
              let currentDate = "";
              for (let i = 1; i < data.length; i++) {
                const row = data[i];
                const dateCell = String(row[0] || "").trim();
                // Check if it's a valid date format
                if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateCell)) {
                  currentDate = dateCell;
                }

                const exercise = String(row[2] || "").trim();
                const weightStr = String(row[4] || "").trim();
                const repsStr = String(row[5] || "").trim();

                if (!currentDate || !exercise) continue;
                if (weightStr === "" || repsStr === "") continue;

                const weight = parseFloat(weightStr) || 0;
                const reps = parseInt(repsStr, 10) || 0;

                if (!exerciseMap.has(exercise)) {
                  exerciseMap.set(exercise, new Map());
                }

                const dateMap = exerciseMap.get(exercise)!;
                if (!dateMap.has(currentDate)) {
                  dateMap.set(currentDate, {
                    totalWeight: 0,
                    totalReps: 0,
                    sets: 0,
                  });
                }

                const entry = dateMap.get(currentDate)!;
                entry.totalWeight += weight;
                entry.totalReps += reps;
                entry.sets += 1;
              }
            }
          })
          .catch(() => {
            // Silently skip failed fetches
          }),
      );
    }

    await Promise.all(fetchPromises);

    // Convert to response format
    const exercises: ExerciseProgression[] = [];

    for (const [exercise, dateMap] of exerciseMap) {
      const entries: ExerciseProgressionEntry[] = [];

      for (const [date, data] of dateMap) {
        // Calculate average weight per set for that day
        const avgWeight = data.totalWeight / data.sets;
        const e1rm = calculateE1RM(avgWeight, data.totalReps / data.sets);
        entries.push({
          date,
          weight: Math.round(avgWeight * 10) / 10,
          reps: data.totalReps,
          sets: data.sets,
          e1rm: Math.round(e1rm * 10) / 10,
        });
      }

      // Sort entries by date (oldest first for chart display)
      entries.sort((a, b) => {
        const parseDate = (d: string) => {
          const [day, month, year] = d.split("/");
          return new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
          ).getTime();
        };
        return parseDate(a.date) - parseDate(b.date);
      });

      if (entries.length > 0) {
        exercises.push({ exercise, entries });
      }
    }

    // Sort exercises alphabetically
    exercises.sort((a, b) => a.exercise.localeCompare(b.exercise));

    return { exercises };
  } catch (error) {
    this.log.error(error);
    return reply
      .status(500)
      .send({ error: "Failed to fetch exercise progression" });
  }
};

// 1RM Records

const ONE_REP_MAX_SHEET_NAME = "Gymerr 1RM Records";

export interface OneRepMaxRecord {
  date: string;
  exercise: string;
  weight: number;
}

export const getOneRepMaxRecords: RouteHandler = async function (request, reply) {
  const { tokens } = getAuthSession(request);

  try {
    const files = await this.sheets.listFiles(tokens, buildQuery("oneRepMax"));

    if (files.length === 0) {
      return { records: [] };
    }

    const spreadsheetId = files[0].id;
    const data = await this.sheets.get(tokens, spreadsheetId, "Sheet1!A:C");

    if (!data || data.length < 2) {
      return { records: [] };
    }

    // Parse records (columns: Date, Exercise, Weight)
    const records: OneRepMaxRecord[] = data
      .slice(1)
      .filter(([date, exercise, weight]) => date && exercise && weight)
      .map(([date, exercise, weight]) => ({
        date: String(date),
        exercise: String(exercise),
        weight: parseFloat(String(weight)) || 0,
      }));

    // Group by exercise and get the best (highest weight) for each
    const bestByExercise = new Map<string, OneRepMaxRecord>();
    for (const record of records) {
      const existing = bestByExercise.get(record.exercise);
      if (!existing || record.weight > existing.weight) {
        bestByExercise.set(record.exercise, record);
      }
    }

    // Also include all records for history
    const allRecords = records.sort((a, b) => {
      const parseDate = (d: string) => {
        const [day, month, year] = d.split("/");
        return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
      };
      return parseDate(b.date) - parseDate(a.date); // Most recent first
    });

    return {
      records: allRecords,
      bestByExercise: Array.from(bestByExercise.values()).sort((a, b) =>
        a.exercise.localeCompare(b.exercise)
      ),
    };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch 1RM records" });
  }
};

export const saveOneRepMax: RouteHandler = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { exercise, weight } = request.body as { exercise: string; weight: number };

  if (!exercise || !weight) {
    return reply.status(400).send({ error: "Exercise and weight are required" });
  }

  try {
    const files = await this.sheets.listFiles(tokens, buildQuery("oneRepMax"));

    let spreadsheetId: string;
    if (files.length === 0) {
      // Create the sheet
      spreadsheetId = await this.sheets.create(tokens, ONE_REP_MAX_SHEET_NAME);
      const { key, value } = AppProperties.oneRepMax;
      await this.sheets.setFileProperties(tokens, spreadsheetId, {
        [key]: value,
      });
      const headers = [["Date", "Exercise", "Weight"]];
      await this.sheets.update(tokens, spreadsheetId, "Sheet1!A1", headers);
    } else {
      spreadsheetId = files[0].id;
    }

    // Format date as DD/MM/YYYY
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

    // Append the 1RM record
    await this.sheets.appendRows(tokens, spreadsheetId, "Sheet1!A:C", [
      [dateStr, exercise, weight],
    ]);

    return { success: true, date: dateStr, exercise, weight };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to save 1RM record" });
  }
};
