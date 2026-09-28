import type { GoogleSheets } from "../../../plugins/googleSheets.js";
import type { AuthTokens } from "./BaseModel.js";
import { ProgramModel } from "./ProgramModel.js";
import { QuickWorkoutModel } from "./QuickWorkoutModel.js";
import type {
  CompletedSet,
  ExerciseBest,
  ExerciseProgression,
  ExerciseProgressionEntry,
  AnalyticsSummary,
  ExerciseRecords,
  MuscleGroupVolume,
  WorkoutConsistency,
  MuscleRecoveryEntry,
} from "../types.js";
import { formatDate } from "../utils/dateUtils.js";
import { prismaClient } from "../../postgres/client.js";

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
    console.log(programSets)
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

  /**
   * Get analytics summary with strength/volume changes
   */
  async getSummary(): Promise<AnalyticsSummary> {
    const sets = await this.getAllCompletedSets();
    const now = new Date();

    // Calculate date boundaries
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);

    // Split sets into time periods
    const recentSets = sets.filter((s) => s.date >= monthAgo);
    const previousSets = sets.filter(
      (s) => s.date >= twoMonthsAgo && s.date < monthAgo,
    );

    // Calculate average E1RM per exercise for comparison
    const getAvgE1RM = (
      setList: CompletedSet[],
    ): Map<string, { total: number; count: number }> => {
      const map = new Map<string, { total: number; count: number }>();
      for (const set of setList) {
        const e1rm = calculateE1RM(set.weight, set.reps);
        if (e1rm <= 0) continue;
        const entry = map.get(set.exercise) || { total: 0, count: 0 };
        entry.total += e1rm;
        entry.count += 1;
        map.set(set.exercise, entry);
      }
      return map;
    };

    const recentE1RMs = getAvgE1RM(recentSets);
    const previousE1RMs = getAvgE1RM(previousSets);

    // Calculate overall strength change
    let strengthChange = 0;
    let exercisesCompared = 0;
    for (const [exercise, recent] of recentE1RMs) {
      const prev = previousE1RMs.get(exercise);
      if (prev && prev.count > 0 && recent.count > 0) {
        const recentAvg = recent.total / recent.count;
        const prevAvg = prev.total / prev.count;
        strengthChange += ((recentAvg - prevAvg) / prevAvg) * 100;
        exercisesCompared++;
      }
    }
    const avgStrengthChange =
      exercisesCompared > 0 ? strengthChange / exercisesCompared : 0;

    // Calculate volume change
    const getVolume = (setList: CompletedSet[]): number =>
      setList.reduce((sum, s) => sum + s.weight * s.reps, 0);

    const recentVolume = getVolume(recentSets);
    const previousVolume = getVolume(previousSets);
    const volumeChange =
      previousVolume > 0
        ? ((recentVolume - previousVolume) / previousVolume) * 100
        : 0;

    // Count workouts
    const workoutDates = new Set(sets.map((s) => formatDate(s.date)));
    const workoutsThisWeek = [...workoutDates].filter((dateStr) => {
      const [day, month, year] = dateStr.split("/").map(Number);
      const date = new Date(year, month - 1, day);
      return date >= weekAgo;
    }).length;

    const workoutsThisMonth = [...workoutDates].filter((dateStr) => {
      const [day, month, year] = dateStr.split("/").map(Number);
      const date = new Date(year, month - 1, day);
      return date >= monthAgo;
    }).length;

    return {
      strengthChange: {
        percentChange: Math.round(avgStrengthChange * 10) / 10,
        periodWeeks: 4,
        direction:
          avgStrengthChange > 1
            ? "up"
            : avgStrengthChange < -1
              ? "down"
              : "stable",
      },
      volumeChange: {
        percentChange: Math.round(volumeChange * 10) / 10,
        periodWeeks: 4,
        direction:
          volumeChange > 5 ? "up" : volumeChange < -5 ? "down" : "stable",
      },
      consistency: {
        workoutsThisWeek,
        workoutsThisMonth,
      },
    };
  }

  /**
   * Get personal records for all exercises
   */
  async getPersonalRecords(): Promise<ExerciseRecords[]> {
    const sets = await this.getAllCompletedSets();
    const recordsMap = new Map<
      string,
      {
        e1rm: {
          value: number;
          date: Date;
          weight: number;
          reps: number;
        } | null;
        maxWeight: { value: number; date: Date; reps: number } | null;
        repPRs: Map<number, { weight: number; date: Date }>;
        allSets: CompletedSet[];
      }
    >();

    // Build records for each exercise
    for (const set of sets) {
      if (!recordsMap.has(set.exercise)) {
        recordsMap.set(set.exercise, {
          e1rm: null,
          maxWeight: null,
          repPRs: new Map(),
          allSets: [],
        });
      }

      const record = recordsMap.get(set.exercise)!;
      record.allSets.push(set);

      const e1rm = calculateE1RM(set.weight, set.reps);

      // Track E1RM PR
      if (e1rm > 0 && (!record.e1rm || e1rm > record.e1rm.value)) {
        record.e1rm = {
          value: Math.round(e1rm * 10) / 10,
          date: set.date,
          weight: set.weight,
          reps: set.reps,
        };
      }

      // Track max weight
      if (!record.maxWeight || set.weight > record.maxWeight.value) {
        record.maxWeight = {
          value: set.weight,
          date: set.date,
          reps: set.reps,
        };
      }

      // Track rep PRs (weight at specific rep ranges)
      const currentRepPR = record.repPRs.get(set.reps);
      if (!currentRepPR || set.weight > currentRepPR.weight) {
        record.repPRs.set(set.reps, { weight: set.weight, date: set.date });
      }
    }

    // Convert to response format
    const result: ExerciseRecords[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const [exercise, record] of recordsMap) {
      if (!record.e1rm || !record.maxWeight) continue;

      // Build rep PRs object with common rep ranges
      const repPRs: Record<number, { weight: number; date: string }> = {};
      for (const reps of [3, 5, 8, 10, 12]) {
        const pr = record.repPRs.get(reps);
        if (pr) {
          repPRs[reps] = { weight: pr.weight, date: formatDate(pr.date) };
        }
      }

      // Find recent PRs (within last 30 days)
      const recentPRs: ExerciseRecords["recentPRs"] = [];

      // Check if E1RM was set recently
      if (record.e1rm.date >= thirtyDaysAgo) {
        recentPRs.push({
          type: "e1rm",
          value: record.e1rm.value,
          date: formatDate(record.e1rm.date),
          description: `${record.e1rm.value}kg e1RM`,
        });
      }

      // Check if max weight was set recently
      if (record.maxWeight.date >= thirtyDaysAgo) {
        recentPRs.push({
          type: "weight",
          value: record.maxWeight.value,
          date: formatDate(record.maxWeight.date),
          description: `${record.maxWeight.value}kg × ${record.maxWeight.reps}`,
        });
      }

      result.push({
        exercise,
        records: {
          e1rm: {
            value: record.e1rm.value,
            date: formatDate(record.e1rm.date),
            weight: record.e1rm.weight,
            reps: record.e1rm.reps,
          },
          maxWeight: {
            value: record.maxWeight.value,
            date: formatDate(record.maxWeight.date),
            reps: record.maxWeight.reps,
          },
          repPRs,
        },
        recentPRs,
      });
    }

    // Sort by exercise name
    result.sort((a, b) => a.exercise.localeCompare(b.exercise));
    return result;
  }

  /**
   * Get workout consistency data
   */
  async getWorkoutConsistency(): Promise<WorkoutConsistency> {
    const sets = await this.getAllCompletedSets();
    const now = new Date();

    // Get unique workout dates
    const workoutDates = [
      ...new Set(sets.map((s) => formatDate(s.date))),
    ].map((dateStr) => {
      const [day, month, year] = dateStr.split("/").map(Number);
      return new Date(year, month - 1, day);
    });
    workoutDates.sort((a, b) => a.getTime() - b.getTime());

    // Calculate date boundaries
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const workoutsThisWeek = workoutDates.filter((d) => d >= weekAgo).length;
    const workoutsThisMonth = workoutDates.filter((d) => d >= monthAgo).length;

    // Calculate streak (consecutive days with workouts ending today or yesterday)
    let streak = 0;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sortedDesc = [...workoutDates].sort(
      (a, b) => b.getTime() - a.getTime(),
    );

    if (sortedDesc.length > 0) {
      const lastWorkout = sortedDesc[0];
      const daysSinceLastWorkout = Math.floor(
        (today.getTime() - lastWorkout.getTime()) / (24 * 60 * 60 * 1000),
      );

      if (daysSinceLastWorkout <= 1) {
        streak = 1;
        for (let i = 1; i < sortedDesc.length; i++) {
          const daysBetween = Math.floor(
            (sortedDesc[i - 1].getTime() - sortedDesc[i].getTime()) /
              (24 * 60 * 60 * 1000),
          );
          if (daysBetween <= 1) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    // Build weekly history (last 8 weeks)
    const weeklyHistory: WorkoutConsistency["weeklyHistory"] = [];
    for (let i = 0; i < 8; i++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const count = workoutDates.filter(
        (d) => d >= weekStart && d < weekEnd,
      ).length;

      weeklyHistory.push({
        weekStart: formatDate(weekStart),
        workoutsCompleted: count,
      });
    }

    return {
      totalWorkouts: workoutDates.length,
      workoutsThisWeek,
      workoutsThisMonth,
      streak,
      weeklyHistory: weeklyHistory.reverse(),
    };
  }

  /**
   * Get volume by muscle group
   */
  async getMuscleGroupVolume(
    period: "week" | "month" = "week",
  ): Promise<MuscleGroupVolume> {
    const sets = await this.getAllCompletedSets();
    const now = new Date();

    // Calculate date boundary
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - (period === "week" ? 7 : 30));

    const recentSets = sets.filter((s) => s.date >= cutoff);

    // Get exercise to muscle group mapping
    const exercises = await prismaClient.exercise.findMany();
    const muscleGroupMap = new Map<string, string>();
    for (const ex of exercises) {
      muscleGroupMap.set(ex.name.toLowerCase(), ex.muscleGroup);
    }

    // Aggregate by muscle group
    const groupData = new Map<string, { sets: number; volume: number }>();

    for (const set of recentSets) {
      // Try to find muscle group for this exercise
      const exerciseLower = set.exercise.toLowerCase();
      let muscleGroup = muscleGroupMap.get(exerciseLower);

      // Try partial matching if exact match fails
      if (!muscleGroup) {
        for (const [name, group] of muscleGroupMap) {
          if (exerciseLower.includes(name) || name.includes(exerciseLower)) {
            muscleGroup = group;
            break;
          }
        }
      }

      // Default to "OTHER" if not found
      muscleGroup = muscleGroup || "OTHER";

      const entry = groupData.get(muscleGroup) || { sets: 0, volume: 0 };
      entry.sets += 1;
      entry.volume += set.weight * set.reps;
      groupData.set(muscleGroup, entry);
    }

    // Convert to response format
    const groups = Array.from(groupData.entries())
      .map(([muscleGroup, data]) => ({
        muscleGroup,
        sets: data.sets,
        volume: Math.round(data.volume),
      }))
      .sort((a, b) => b.sets - a.sets);

    return { period, groups };
  }

  /**
   * Get muscle recovery status based on recent training
   * Recovery times based on research:
   * - Abs: 24-30 hours
   * - Biceps/Triceps/Forearms: 48 hours
   * - Chest/Shoulders: 48-56 hours
   * - Back: 48-72 hours
   * - Legs (Quads/Hamstrings/Glutes): 72 hours
   *
   * RIR (Reps In Reserve) affects fatigue level, not recovery time:
   * - RIR 0 (failure): Higher fatigue shown
   * - RIR 1-2: Moderate fatigue boost
   * - RIR 3+: Baseline fatigue
   */
  async getMuscleRecovery(): Promise<MuscleRecoveryEntry[]> {
    const sets = await this.getAllCompletedSets();
    const now = new Date();

    // Recovery time in hours per muscle group (based on research)
    const recoveryHours: Record<string, number> = {
      ABS: 30,
      BICEPS: 48,
      TRICEPS: 48,
      CHEST: 48,
      SHOULDERS: 48,
      BACK: 48,
      LEGS: 72,
    };

    // Get exercise to muscle group mapping
    const exercises = await prismaClient.exercise.findMany();
    const muscleGroupMap = new Map<string, string>();
    for (const ex of exercises) {
      muscleGroupMap.set(ex.name.toLowerCase(), ex.muscleGroup);
    }

    // Track sets per muscle group in last 72 hours
    const cutoff = new Date(now);
    cutoff.setHours(cutoff.getHours() - 72);

    const muscleData = new Map<
      string,
      {
        sets: number;
        lastTrained: Date | null;
        totalIntensity: number; // Sum of intensity factors from RIR
        setsWithRir: number; // Sets that have RIR data
      }
    >();

    // Initialize all muscle groups
    for (const group of Object.keys(recoveryHours)) {
      muscleData.set(group, {
        sets: 0,
        lastTrained: null,
        totalIntensity: 0,
        setsWithRir: 0,
      });
    }

    for (const set of sets) {
      if (set.date < cutoff) continue;

      // Find muscle group for this exercise
      const exerciseLower = set.exercise.toLowerCase();
      let muscleGroup = muscleGroupMap.get(exerciseLower);

      // Try partial matching if exact match fails
      if (!muscleGroup) {
        for (const [name, group] of muscleGroupMap) {
          if (exerciseLower.includes(name) || name.includes(exerciseLower)) {
            muscleGroup = group;
            break;
          }
        }
      }

      if (!muscleGroup || !recoveryHours[muscleGroup]) continue;

      const data = muscleData.get(muscleGroup)!;
      data.sets += 1;

      // Calculate intensity factor based on RIR
      // Lower RIR = higher intensity = more fatigue displayed
      if (set.rir !== undefined) {
        // RIR 0 = 1.3x fatigue, RIR 1 = 1.2x, RIR 2 = 1.1x, RIR 3+ = 1.0x
        let intensityFactor = 1.0;
        if (set.rir === 0) {
          intensityFactor = 1.3;
        } else if (set.rir === 1) {
          intensityFactor = 1.2;
        } else if (set.rir === 2) {
          intensityFactor = 1.1;
        }
        data.totalIntensity += intensityFactor;
        data.setsWithRir += 1;
      }

      if (!data.lastTrained || set.date > data.lastTrained) {
        data.lastTrained = set.date;
      }
      muscleData.set(muscleGroup, data);
    }

    // Calculate fatigue and recovery for each muscle group
    const result: MuscleRecoveryEntry[] = [];

    for (const [muscleGroup, data] of muscleData) {
      const recoveryTime = recoveryHours[muscleGroup];

      // Calculate average intensity factor from RIR data
      // If no RIR data, assume baseline (1.0x)
      const avgIntensity =
        data.setsWithRir > 0 ? data.totalIntensity / data.setsWithRir : 1.0;

      let fatiguePercent = 0;
      let hoursToRecovery = 0;

      if (data.lastTrained) {
        const hoursSinceTraining =
          (now.getTime() - data.lastTrained.getTime()) / (1000 * 60 * 60);

        // Calculate fatigue based on time since training and volume
        const volumeFactor = Math.min(data.sets / 10, 1.5); // caps at 15 sets
        const timeFactor = Math.max(0, 1 - hoursSinceTraining / recoveryTime);

        // Base fatigue from time and volume
        let baseFatigue = timeFactor * 100 * volumeFactor;

        // Apply intensity multiplier from RIR (affects displayed fatigue, not recovery time)
        fatiguePercent = Math.round(baseFatigue * avgIntensity);
        fatiguePercent = Math.min(100, Math.max(0, fatiguePercent));

        // Recovery time is fixed based on muscle group research
        hoursToRecovery = Math.max(
          0,
          Math.round(recoveryTime - hoursSinceTraining),
        );
      }

      result.push({
        muscleGroup,
        fatiguePercent,
        hoursToRecovery,
        lastTrained: data.lastTrained
          ? data.lastTrained.toISOString()
          : null,
        sets: data.sets,
      });
    }

    // Sort by fatigue (most fatigued first)
    result.sort((a, b) => b.fatiguePercent - a.fatiguePercent);
    return result;
  }
}
