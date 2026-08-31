import type { GoogleSheets } from "../../plugins/googleSheets.js";
import type { AuthTokens } from "./BaseModel.js";
import { ProgramModel } from "./ProgramModel.js";
import { QuickWorkoutModel } from "./QuickWorkoutModel.js";
import type {
  CompletedSet,
  ExerciseBest,
  ExerciseProgression,
  ExerciseProgressionEntry,
} from "../types.js";
import { formatDate } from "../utils/dateUtils.js";

/**
 * Calculate estimated 1RM using Epley formula
 */
function calculateE1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export class AnalyticsModel {
  private programs: ProgramModel;
  private quickWorkouts: QuickWorkoutModel;

  constructor(sheets: GoogleSheets, tokens: AuthTokens) {
    this.programs = new ProgramModel(sheets, tokens);
    this.quickWorkouts = new QuickWorkoutModel(sheets, tokens);
  }

  /**
   * Get all completed sets from both programs and quick workouts
   */
  private async getAllCompletedSets(): Promise<CompletedSet[]> {
    const [programSets, quickSets] = await Promise.all([
      this.programs.getCompletedSets(),
      this.quickWorkouts.getCompletedSets(),
    ]);
    return [...programSets, ...quickSets];
  }

  /**
   * Get the best e1rm for each exercise
   */
  async getBests(): Promise<Record<string, ExerciseBest>> {
    const sets = await this.getAllCompletedSets();
    const bests: Record<string, ExerciseBest> = {};

    for (const set of sets) {
      const e1rm = calculateE1RM(set.weight, set.reps);
      if (e1rm <= 0) continue;

      const existing = bests[set.exercise];
      if (!existing || e1rm > existing.e1rm) {
        bests[set.exercise] = {
          weight: Math.round(set.weight * 100) / 100,
          reps: set.reps,
          e1rm: Math.round(e1rm * 100) / 100,
        };
      }
    }

    return bests;
  }

  /**
   * Get progression data for all exercises over time
   */
  async getProgression(): Promise<ExerciseProgression[]> {
    const sets = await this.getAllCompletedSets();

    // Group by exercise -> date -> aggregated data
    const exerciseMap = new Map<
      string,
      Map<string, { totalWeight: number; totalReps: number; sets: number }>
    >();

    for (const set of sets) {
      const dateKey = formatDate(set.date);

      if (!exerciseMap.has(set.exercise)) {
        exerciseMap.set(set.exercise, new Map());
      }

      const dateMap = exerciseMap.get(set.exercise)!;
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { totalWeight: 0, totalReps: 0, sets: 0 });
      }

      const entry = dateMap.get(dateKey)!;
      entry.totalWeight += set.weight;
      entry.totalReps += set.reps;
      entry.sets += 1;
    }

    // Convert to response format
    const exercises: ExerciseProgression[] = [];

    for (const [exercise, dateMap] of exerciseMap) {
      const entries: ExerciseProgressionEntry[] = [];

      for (const [dateStr, data] of dateMap) {
        const avgWeight = data.totalWeight / data.sets;
        const avgReps = data.totalReps / data.sets;
        const e1rm = calculateE1RM(avgWeight, avgReps);

        // Parse date string back to Date
        const [day, month, year] = dateStr.split("/");
        const date = new Date(Number(year), Number(month) - 1, Number(day));

        entries.push({
          date,
          weight: Math.round(avgWeight * 10) / 10,
          reps: data.totalReps,
          sets: data.sets,
          e1rm: Math.round(e1rm * 10) / 10,
        });
      }

      // Sort by date (oldest first)
      entries.sort((a, b) => a.date.getTime() - b.date.getTime());

      if (entries.length > 0) {
        exercises.push({ exercise, entries });
      }
    }

    // Sort exercises alphabetically
    exercises.sort((a, b) => a.exercise.localeCompare(b.exercise));

    return exercises;
  }

  /**
   * Get all unique exercise names
   */
  async getExerciseNames(): Promise<string[]> {
    const [programExercises, quickExercises] = await Promise.all([
      this.programs.getExerciseNames(),
      this.quickWorkouts.getExerciseNames(),
    ]);

    const all = new Set([...programExercises, ...quickExercises]);
    return Array.from(all).sort();
  }
}
