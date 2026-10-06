import type { WorkoutTemplate, Prisma } from "@prisma/client";
import { prismaClient } from "./client.js";

export interface TemplateExercise {
  name: string;
  sets: number;
  reps: number;
  rir: number;
}

export interface WorkoutTemplateInput {
  name: string;
  exercises: TemplateExercise[];
}

export class WorkoutTemplateModel {
  findAll(userEmail: string): Promise<WorkoutTemplate[]> {
    return prismaClient.workoutTemplate.findMany({
      where: { userEmail },
      orderBy: { createdAt: "desc" },
    });
  }

  create(
    userEmail: string,
    data: WorkoutTemplateInput,
  ): Promise<WorkoutTemplate> {
    return prismaClient.workoutTemplate.create({
      data: {
        userEmail,
        name: data.name,
        exercises: data.exercises as unknown as Prisma.InputJsonValue,
      },
    });
  }

  delete(id: string, userEmail: string): Promise<WorkoutTemplate | null> {
    return prismaClient.workoutTemplate.delete({
      where: { id, userEmail },
    });
  }
}
