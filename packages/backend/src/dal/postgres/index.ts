import { OnboardingModel } from "./OnboardingModel.js";
import { AiGenerationModel } from "./AiGenerationModel.js";
import { ExerciseModel } from "./ExerciseModel.js";

/**
 * Postgres data access (via Prisma), grouped by model.
 *
 * @example
 * const row = await prisma.onboarding.get(email);
 * await prisma.onboarding.upsert(email, { weight, height, age, gender, goal, isComplete });
 * await prisma.aiGenerations.create(email, { type: "CouchCue", content: tip });
 */
export const prisma = {
  onboarding: new OnboardingModel(),
  aiGenerations: new AiGenerationModel(),
  exercises: new ExerciseModel(),
};

export type { OnboardingInput } from "./OnboardingModel.js";
export type { AiGenerationInput } from "./AiGenerationModel.js";
export type { ExerciseInput } from "./ExerciseModel.js";
export {
  Gender,
  Goal,
  ExperienceLevel,
  MuscleGroup,
  AiGenerationType,
} from "@prisma/client";
