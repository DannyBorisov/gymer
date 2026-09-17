import { z } from "zod";

const QuickWorkoutSetInputSchema = z.object({
  exercise: z.string(),
  set: z.number(),
  weight: z.string(),
  reps: z.string(),
  rir: z.string(),
  notes: z.string(),
});

export const SaveQuickWorkoutBodySchema = z.object({
  workoutId: z.string(),
  duration: z.string(),
  date: z.string().optional(),
  sets: z.array(QuickWorkoutSetInputSchema),
});
export type SaveQuickWorkoutBodyType = z.infer<
  typeof SaveQuickWorkoutBodySchema
>;

export const GetWorkoutDetailParamsSchema = z.object({
  id: z.string(),
});
export type GetWorkoutDetailParamsType = z.infer<
  typeof GetWorkoutDetailParamsSchema
>;

export const GetWorkoutDetailQuerySchema = z.object({
  type: z.string(),
  programId: z.string().optional(),
  week: z.string().optional(),
  workout: z.string().optional(),
});
export type GetWorkoutDetailQueryType = z.infer<
  typeof GetWorkoutDetailQuerySchema
>;
