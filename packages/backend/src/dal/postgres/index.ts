import { OnboardingModel } from "./OnboardingModel.js";
import { AiTipModel } from "./AiTipModel.js";

/**
 * Postgres data access (via Prisma), grouped by model.
 *
 * @example
 * const row = await prisma.onboarding.get(email);
 * await prisma.onboarding.upsert(email, { weight, height, age, gender, goal, isComplete });
 * await prisma.aiTips.create(email, { programName, workoutName, tip });
 */
export const prisma = {
  onboarding: new OnboardingModel(),
  aiTips: new AiTipModel(),
};

export type { OnboardingInput } from "./OnboardingModel.js";
export type { AiTipInput } from "./AiTipModel.js";
export { Gender, Goal, ExperienceLevel } from "@prisma/client";
