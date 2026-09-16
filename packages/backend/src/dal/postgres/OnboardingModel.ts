import type { ExperienceLevel, Gender, Goal, Onboarding } from "@prisma/client";
import { prismaClient } from "./client.js";

export interface OnboardingInput {
  weight: number;
  height: number;
  age: number;
  gender: Gender;
  goal: Goal;
  experienceLevel: ExperienceLevel;
  isComplete: boolean;
}

export class OnboardingModel {
  get(userEmail: string): Promise<Onboarding | null> {
    return prismaClient.onboarding.findUnique({ where: { userEmail } });
  }

  upsert(userEmail: string, data: OnboardingInput): Promise<Onboarding> {
    return prismaClient.onboarding.upsert({
      where: { userEmail },
      create: { userEmail, ...data },
      update: data,
    });
  }
}
