import type { AiGeneration, AiGenerationType } from "@prisma/client";
import { prismaClient } from "./client.js";

export interface AiGenerationInput {
  type: AiGenerationType;
  content: string;
}

export class AiGenerationModel {
  findRecent(
    userEmail: string,
    type: AiGenerationType,
    limit = 10,
  ): Promise<AiGeneration[]> {
    return prismaClient.aiGeneration.findMany({
      where: { userEmail, type },
      orderBy: { date: "desc" },
      take: limit,
    });
  }

  create(userEmail: string, data: AiGenerationInput): Promise<AiGeneration> {
    return prismaClient.aiGeneration.create({ data: { userEmail, ...data } });
  }
}
