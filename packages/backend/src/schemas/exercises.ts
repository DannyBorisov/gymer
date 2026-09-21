import { z } from "zod";
import { MuscleGroup } from "../dal/index.js";

// ============ POST /exercises ============

export const CreateExerciseBodySchema = z.object({
  name: z.string().min(1),
  muscleGroup: z.enum(MuscleGroup),
});
export type CreateExerciseBodyType = z.infer<typeof CreateExerciseBodySchema>;
