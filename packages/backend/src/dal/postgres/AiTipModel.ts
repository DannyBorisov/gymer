import type { AiTip } from "@prisma/client";
import { prismaClient } from "./client.js";

export interface AiTipInput {
  programName: string;
  workoutName: string;
  tip: string;
}

export class AiTipModel {
  findRecent(userEmail: string, limit = 10): Promise<AiTip[]> {
    return prismaClient.aiTip.findMany({
      where: { userEmail },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  create(userEmail: string, data: AiTipInput): Promise<AiTip> {
    return prismaClient.aiTip.create({ data: { userEmail, ...data } });
  }
}
