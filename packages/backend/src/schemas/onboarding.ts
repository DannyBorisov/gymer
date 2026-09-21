import { z } from "zod";
import { Gender, Goal, ExperienceLevel } from "../dal/index.js";

export const SaveOnboardingBodySchema = z.object({
  weight: z.number().positive(),
  height: z.number().positive(),
  age: z.number().int().positive(),
  gender: z.enum(Gender),
  goal: z.enum(Goal),
  experienceLevel: z.nativeEnum(ExperienceLevel),
  isComplete: z.boolean().default(true),
});
export type SaveOnboardingBodyType = z.infer<typeof SaveOnboardingBodySchema>;
