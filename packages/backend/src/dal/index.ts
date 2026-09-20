/**
 * Data Access Layer
 *
 * - `dal/gsql`     — Google Sheets ORM (createGSQL, per-request)
 * - `dal/postgres` — Postgres via Prisma (singleton client + models)
 */
export { GSQL, createGSQL } from "./gsql/gsql.js";
export type { AuthTokens } from "./gsql/models/BaseModel.js";
export type {
  // Body Weight
  BodyWeightEntry,
  CreateBodyWeightInput,
  // Program Models
  Set,
  Exercise,
  Workout,
  Program,
  ProgramSummary,
  // Where/Update
  ExerciseWhere,
  WorkoutWhere,
  ProgramWhere,
  SetUpdateData,
  WorkoutUpdateData,
  ProgramUpdateInput,
  // Create
  CreateProgramInput,
  CreateProgramWorkout,
  CreateProgramExercise,
  // Quick Workouts
  QuickWorkout,
  QuickWorkoutSet,
  CreateQuickWorkoutInput,
  // Analytics
  CompletedSet,
  ExerciseBest,
  ExerciseProgression,
  ExerciseProgressionEntry,
} from "./gsql/types.js";

export { prisma, Gender, Goal, ExperienceLevel, MuscleGroup } from "./postgres/index.js";
export type { OnboardingInput, AiTipInput, ExerciseInput } from "./postgres/index.js";
