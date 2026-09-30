import { z } from "zod";

// ============ POST /workout-tip ============

export const WorkoutTipBodySchema = z.object({
  programId: z.string(),
  week: z.number(),
  workoutName: z.string(),
});
export type WorkoutTipBodyType = z.infer<typeof WorkoutTipBodySchema>;

// ============ POST /workout-chat ============

export const WorkoutChatBodySchema = z.object({
  week: z.number(),
  workoutName: z.string(),
  message: z.string(),
  currentExercise: z.string().optional(),
  currentSetIndex: z.number().optional(),
  workoutData: z.array(z.object({
    exercise: z.string(),
    setIndex: z.number(),
    // Target values
    targetReps: z.number().optional(),
    targetRir: z.number().optional(),
    targetRestTime: z.number().optional(),
    // Achieved values
    weight: z.number().optional(),
    reps: z.number().optional(),
    rir: z.number().optional(),
    restTime: z.number().optional(),
    isComplete: z.boolean(),
  })).optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional(),
});
export type WorkoutChatBodyType = z.infer<typeof WorkoutChatBodySchema>;

// ============ POST /generate-program ============

export const GenerateProgramBodySchema = z.object({
  durationWeeks: z.number(),
  frequency: z.number(),
});
export type GenerateProgramBodyType = z.infer<typeof GenerateProgramBodySchema>;

// ============ POST /plateau-advice ============

export const PlateauAdviceBodySchema = z.object({
  exercise: z.string(),
});
export type PlateauAdviceBodyType = z.infer<typeof PlateauAdviceBodySchema>;
