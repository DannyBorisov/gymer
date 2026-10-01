/**
 * QuickWorkoutCacheModel - Fast quick workout reads from PostgreSQL cache
 */

import { prismaClient } from "../postgres/client.js";

export interface QuickWorkoutSet {
  exercise: string;
  set: number;
  weight: string;
  reps: string;
  rir: string;
  notes: string;
}

export interface QuickWorkout {
  workoutId: string;
  date: string;
  duration: string;
  sets: QuickWorkoutSet[];
}

export class QuickWorkoutCacheModel {
  constructor(private userEmail: string) {}

  /**
   * List all quick workouts for user
   */
  async findAll(): Promise<QuickWorkout[]> {
    const workouts = await prismaClient.quickWorkoutCache.findMany({
      where: { userEmail: this.userEmail },
      orderBy: { date: "desc" },
    });

    return workouts.map((w) => w.data as unknown as QuickWorkout);
  }

  /**
   * Create quick workout in cache
   */
  async create(workout: QuickWorkout): Promise<void> {
    const date = new Date(workout.date);

    await prismaClient.quickWorkoutCache.create({
      data: {
        id: workout.workoutId,
        userEmail: this.userEmail,
        data: workout as any,
        date,
      },
    });

    // Also populate CompletedSetCache for analytics
    const sets: Array<{
      userEmail: string;
      programId: null;
      exercise: string;
      date: Date;
      weight: number;
      reps: number;
      rir: number | null;
      restTime: null;
    }> = [];

    for (const set of workout.sets) {
      const weight = parseFloat(set.weight);
      const reps = parseInt(set.reps, 10);

      if (!isNaN(weight) && !isNaN(reps) && weight > 0 && reps > 0) {
        sets.push({
          userEmail: this.userEmail,
          programId: null,
          exercise: set.exercise,
          date,
          weight,
          reps,
          rir: set.rir ? parseInt(set.rir, 10) : null,
          restTime: null,
        });
      }
    }

    if (sets.length > 0) {
      await prismaClient.completedSetCache.createMany({
        data: sets,
      });
    }
  }

  /**
   * Get completed sets from quick workouts (for analytics)
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
      where: {
        userEmail: this.userEmail,
        programId: null, // Quick workouts have no programId
      },
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
}
