import type { Exercise, MuscleGroup } from "@prisma/client";
import { prismaClient } from "./client.js";

export interface ExerciseInput {
  name: string;
  muscleGroup: MuscleGroup;
  variant?: string[];
}

export class ExerciseModel {
  findAll(): Promise<Exercise[]> {
    return prismaClient.exercise.findMany({ orderBy: { name: "asc" } });
  }

  findByMuscleGroup(muscleGroup: MuscleGroup): Promise<Exercise[]> {
    return prismaClient.exercise.findMany({
      where: { muscleGroup },
      orderBy: { name: "asc" },
    });
  }

  create(data: ExerciseInput): Promise<Exercise> {
    return prismaClient.exercise.create({ data });
  }

  createMany(data: ExerciseInput[]): Promise<{ count: number }> {
    return prismaClient.exercise.createMany({ data });
  }
}
