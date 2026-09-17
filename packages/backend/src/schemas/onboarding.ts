import { z } from "zod";
import { Gender, Goal, ExperienceLevel } from "../dal/index.js";

// ============ PUT / ============

export const SaveOnboardingBodySchema = z.object({
  weight: z.number().positive(),
  height: z.number().positive(),
  age: z.number().int().positive(),
  gender: z.nativeEnum(Gender),
  goal: z.nativeEnum(Goal),
  experienceLevel: z.nativeEnum(ExperienceLevel),
  isComplete: z.boolean().default(true),
});
export type SaveOnboardingBodyType = z.infer<typeof SaveOnboardingBodySchema>;
