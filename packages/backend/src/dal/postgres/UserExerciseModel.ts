import type { UserExercise, MuscleGroup } from "@prisma/client";
import { prismaClient } from "./client.js";

export interface UserExerciseInput {
  name: string;
  muscleGroup: MuscleGroup;
}

export class UserExerciseModel {
  findByUser(userEmail: string): Promise<UserExercise[]> {
    return prismaClient.userExercise.findMany({
      where: { userEmail },
      orderBy: { name: "asc" },
    });
  }

  create(userEmail: string, data: UserExerciseInput): Promise<UserExercise> {
    return prismaClient.userExercise.create({
      data: { userEmail, ...data },
    });
  }

  delete(userEmail: string, name: string): Promise<UserExercise> {
    return prismaClient.userExercise.delete({
      where: { userEmail_name: { userEmail, name } },
    });
  }
}
