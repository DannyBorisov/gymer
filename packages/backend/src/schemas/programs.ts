import { z } from "zod";

const FrequencySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal("every-other-day"),
]);

const ProgramExerciseSchema = z.object({
  name: z.string(),
  variant: z.string().optional(),
  sets: z.number(),
  reps: z.number(),
  rir: z.number(),
  customRir: z.boolean().optional(),
});

const ProgramWorkoutSchema = z.object({
  name: z.string(),
  exercises: z.array(ProgramExerciseSchema),
});

const ExerciseWhereSchema = z.object({
  name: z.string(),
  set: z.number().optional(),
});

const WorkoutWhereSchema = z.object({
  name: z.string(),
  exercise: ExerciseWhereSchema.optional(),
});

const ProgramWhereSchema = z.object({
  week: z.number(),
  workout: WorkoutWhereSchema.optional(),
});

const SetUpdateDataSchema = z.object({
  achievedWeight: z.number().optional(),
  achievedReps: z.number().optional(),
  achievedRir: z.string().optional(),
  notes: z.string().optional(),
});

const WorkoutUpdateDataSchema = z.object({
  date: z.union([z.date(), z.string()]).optional(),
  duration: z.string().optional(),
});

const ProgramUpdateInputSchema = z.object({
  where: ProgramWhereSchema,
  data: z.union([SetUpdateDataSchema, WorkoutUpdateDataSchema]),
});

export const GetProgramParamsSchema = z.object({
  id: z.string(),
});
export type GetProgramParamsType = z.infer<typeof GetProgramParamsSchema>;

export const CreateProgramBodySchema = z.object({
  name: z.string(),
  durationWeeks: z.number(),
  frequency: FrequencySchema,
  dynamicRir: z.boolean(),
  startingRir: z.number(),
  workouts: z.array(ProgramWorkoutSchema),
});
export type CreateProgramBodyType = z.infer<typeof CreateProgramBodySchema>;

export const EditProgramParamsSchema = z.object({
  id: z.string(),
});
export type EditProgramParamsType = z.infer<typeof EditProgramParamsSchema>;

// Same shape as create — editing replaces the whole structural template.
export const EditProgramBodySchema = CreateProgramBodySchema;
export type EditProgramBodyType = z.infer<typeof EditProgramBodySchema>;

export const UpdateProgramParamsSchema = z.object({
  id: z.string(),
});
export type UpdateProgramParamsType = z.infer<typeof UpdateProgramParamsSchema>;

export const UpdateProgramBodySchema = z.union([
  ProgramUpdateInputSchema,
  z.array(ProgramUpdateInputSchema),
]);
export type UpdateProgramBodyType = z.infer<typeof UpdateProgramBodySchema>;

export const DeleteProgramParamsSchema = z.object({
  id: z.string(),
});
export type DeleteProgramParamsType = z.infer<typeof DeleteProgramParamsSchema>;

export const CopyProgramParamsSchema = z.object({
  id: z.string(),
});
export type CopyProgramParamsType = z.infer<typeof CopyProgramParamsSchema>;

export const RenameProgramParamsSchema = z.object({
  id: z.string(),
});
export type RenameProgramParamsType = z.infer<typeof RenameProgramParamsSchema>;

export const RenameProgramBodySchema = z.object({
  name: z.string(),
});
export type RenameProgramBodyType = z.infer<typeof RenameProgramBodySchema>;

export const AddSetParamsSchema = z.object({
  id: z.string(),
});
export type AddSetParamsType = z.infer<typeof AddSetParamsSchema>;

export const AddSetBodySchema = z.object({
  week: z.number(),
  workoutName: z.string(),
  exerciseName: z.string(),
  targetReps: z.number().optional(),
  targetRir: z.string().optional(),
});
export type AddSetBodyType = z.infer<typeof AddSetBodySchema>;
