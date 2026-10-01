/**
 * ProgramCacheModel - Fast program reads from PostgreSQL cache
 *
 * Flow:
 * 1. Reads always come from cache (fast, no quota)
 * 2. Writes go to cache immediately, then sync to Sheets in background
 * 3. On workout completion, populate CompletedSetCache for analytics
 */

import { prismaClient } from "../postgres/client.js";
import type { Program, Workout } from "../gsql/types.js";

export interface ProgramSummary {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
}

export class ProgramCacheModel {
  constructor(private userEmail: string) {}

  /**
   * List all programs for user (summary only)
   */
  async findAll(): Promise<ProgramSummary[]> {
    const programs = await prismaClient.programCache.findMany({
      where: { userEmail: this.userEmail },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return programs.map((p) => ({
      id: p.id,
      name: p.name,
      createdTime: p.createdAt.toISOString(),
      modifiedTime: p.updatedAt.toISOString(),
    }));
  }

  /**
   * Get full program by ID
   */
  async find(id: string): Promise<Program | null> {
    const cached = await prismaClient.programCache.findUnique({
      where: { id },
    });

    if (!cached || cached.userEmail !== this.userEmail) {
      return null;
    }

    return cached.data as unknown as Program;
  }

  /**
   * Create or update program in cache
   */
  async upsert(id: string, name: string, data: Program): Promise<void> {
    await prismaClient.programCache.upsert({
      where: { id },
      create: {
        id,
        userEmail: this.userEmail,
        name,
        data: data as any,
      },
      update: {
        name,
        data: data as any,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update program data (for set updates during workout)
   */
  async updateData(id: string, data: Program): Promise<void> {
    await prismaClient.programCache.update({
      where: { id },
      data: {
        data: data as any,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Rename program
   */
  async rename(id: string, name: string): Promise<void> {
    await prismaClient.programCache.update({
      where: { id },
      data: { name, updatedAt: new Date() },
    });
  }

  /**
   * Delete program from cache
   */
  async delete(id: string): Promise<void> {
    await prismaClient.programCache.delete({
      where: { id },
    });

    // Also delete related completed sets
    await prismaClient.completedSetCache.deleteMany({
      where: { programId: id },
    });
  }

  /**
   * Check if program exists in cache
   */
  async exists(id: string): Promise<boolean> {
    const count = await prismaClient.programCache.count({
      where: { id, userEmail: this.userEmail },
    });
    return count > 0;
  }

  /**
   * Populate CompletedSetCache when a workout is completed
   * This enables fast analytics queries
   */
  async recordCompletedSets(
    programId: string | null,
    workout: Workout,
    date: Date,
  ): Promise<void> {
    const sets: Array<{
      userEmail: string;
      programId: string | null;
      exercise: string;
      date: Date;
      weight: number;
      reps: number;
      rir: number | null;
      restTime: number | null;
    }> = [];

    for (const exercise of workout.exercises) {
      const exerciseName = exercise.variant
        ? `${exercise.name} (${exercise.variant})`
        : exercise.name;

      for (const set of exercise.sets) {
        if (set.achievedWeight !== undefined && set.achievedReps !== undefined) {
          sets.push({
            userEmail: this.userEmail,
            programId,
            exercise: exerciseName,
            date,
            weight: set.achievedWeight,
            reps: set.achievedReps,
            rir: set.achievedRir ? parseInt(set.achievedRir, 10) : null,
            restTime: set.achievedRestTime ?? null,
          });
        }
      }
    }

    if (sets.length > 0) {
      await prismaClient.completedSetCache.createMany({
        data: sets,
      });
    }
  }

  /**
   * Get all completed sets for analytics (replaces getAllCompletedSets in AnalyticsModel)
   */
  async getCompletedSets(): Promise<
    Array<{
      exercise: string;
      date: Date;
      weight: number;
      reps: number;
      rir: number | null;
    }>
  > {
    return prismaClient.completedSetCache.findMany({
      where: { userEmail: this.userEmail },
      select: {
        exercise: true,
        date: true,
        weight: true,
        reps: true,
        rir: true,
      },
      orderBy: { date: "asc" },
    });
  }

  /**
   * Get exercise progression data (grouped by exercise and date)
   */
  async getExerciseProgression(): Promise<
    Map<string, Array<{ date: Date; weight: number; reps: number; sets: number }>>
  > {
    const sets = await prismaClient.completedSetCache.findMany({
      where: { userEmail: this.userEmail },
      select: {
        exercise: true,
        date: true,
        weight: true,
        reps: true,
      },
      orderBy: { date: "asc" },
    });

    // Group by exercise -> date
    const progression = new Map<
      string,
      Array<{ date: Date; weight: number; reps: number; sets: number }>
    >();

    const exerciseDateMap = new Map<string, Map<string, { weight: number; reps: number; sets: number }>>();

    for (const set of sets) {
      const dateKey = set.date.toISOString().split("T")[0];

      if (!exerciseDateMap.has(set.exercise)) {
        exerciseDateMap.set(set.exercise, new Map());
      }

      const dateMap = exerciseDateMap.get(set.exercise)!;
      const existing = dateMap.get(dateKey);

      if (existing) {
        // Take max weight/reps, increment sets
        existing.weight = Math.max(existing.weight, set.weight);
        existing.reps = Math.max(existing.reps, set.reps);
        existing.sets += 1;
      } else {
        dateMap.set(dateKey, { weight: set.weight, reps: set.reps, sets: 1 });
      }
    }

    // Convert to array format
    for (const [exercise, dateMap] of exerciseDateMap) {
      const entries: Array<{ date: Date; weight: number; reps: number; sets: number }> = [];
      for (const [dateKey, data] of dateMap) {
        entries.push({ date: new Date(dateKey), ...data });
      }
      entries.sort((a, b) => a.date.getTime() - b.date.getTime());
      progression.set(exercise, entries);
    }

    return progression;
  }

  /**
   * Get personal bests for each exercise
   */
  async getExerciseBests(): Promise<
    Record<string, { weight: number; reps: number; e1rm: number }>
  > {
    const sets = await prismaClient.completedSetCache.findMany({
      where: { userEmail: this.userEmail },
      select: {
        exercise: true,
        weight: true,
        reps: true,
      },
    });

    const bests: Record<string, { weight: number; reps: number; e1rm: number }> = {};

    for (const set of sets) {
      const e1rm = set.weight * (1 + set.reps / 30);
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
}
