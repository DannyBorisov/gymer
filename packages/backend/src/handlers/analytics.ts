import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import { buildQuery } from "../plugins/googleSheets.js";

export interface ExerciseProgressionEntry {
  date: string;
  weight: number;
  reps: number;
  sets: number;
}

export interface ExerciseProgression {
  exercise: string;
  entries: ExerciseProgressionEntry[];
}

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

                // Check if this is a date (DD/MM/YYYY format) vs duration (H:MM:SS)
                const isDate = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateCell);
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
        entries.push({
          date,
          weight: Math.round(avgWeight * 10) / 10,
          reps: data.totalReps,
          sets: data.sets,
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
