import { z } from "zod";

// ============ POST /workout-tip ============

export const WorkoutTipBodySchema = z.object({
  programId: z.string(),
  week: z.number(),
  workoutName: z.string(),
});
export type WorkoutTipBodyType = z.infer<typeof WorkoutTipBodySchema>;

// ============ POST /generate-program ============

export const GenerateProgramBodySchema = z.object({
  durationWeeks: z.number(),
  frequency: z.number(),
});
export type GenerateProgramBodyType = z.infer<typeof GenerateProgramBodySchema>;
