import type { GoogleSheets } from "../../plugins/googleSheets.js";
import type { AuthenticatedSession } from "../../middlewares/auth.js";
import { FirebaseSheets } from "../firebase/FirebaseSheets.js";
import { BodyWeightModel } from "./models/BodyWeightModel.js";
import { ProgramModel } from "./models/ProgramModel.js";
import { QuickWorkoutModel } from "./models/QuickWorkoutModel.js";
import { AnalyticsModel } from "./models/AnalyticsModel.js";
import { UserExerciseModel } from "./models/UserExerciseModel.js";
import type { AuthTokens } from "./models/BaseModel.js";

/**
 * GSQL - Data Access Layer
 *
 * ORM-like data access layer using Firebase Storage as the backend.
 *
 * @example
 * ```typescript
 * const gsql = createGSQL(session);
 *
 * // Body Weight
 * const entries = await gsql.bodyWeight.findAll();
 * await gsql.bodyWeight.create({ weight: 75.5 });
 *
 * // Programs
 * const programs = await gsql.programs.findAll();
 * const program = await gsql.programs.find('programId');
 *
 * // Quick Workouts
 * await gsql.quickWorkouts.create({ workoutId, duration, sets });
 *
 * // Analytics
 * const bests = await gsql.analytics.getBests();
 * const progression = await gsql.analytics.getProgression();
 *
 * // User Exercises
 * const exercises = await gsql.userExercises.findAll();
 * await gsql.userExercises.create({ name, muscleGroup });
 * ```
 */
export class GSQL {
  public readonly bodyWeight: BodyWeightModel;
  public readonly programs: ProgramModel;
  public readonly quickWorkouts: QuickWorkoutModel;
  public readonly analytics: AnalyticsModel;
  public readonly userExercises: UserExerciseModel;

  constructor(tokens: AuthTokens, sheets: FirebaseSheets) {
    // FirebaseSheets implements the same interface as GoogleSheets
    const sheetsClient = sheets as unknown as GoogleSheets;
    this.bodyWeight = new BodyWeightModel(sheetsClient, tokens);
    this.programs = new ProgramModel(sheetsClient, tokens);
    this.quickWorkouts = new QuickWorkoutModel(sheetsClient, tokens);
    this.analytics = new AnalyticsModel(sheetsClient, tokens);
    this.userExercises = new UserExerciseModel(sheetsClient, tokens);
  }
}

/**
 * Factory function for creating GSQL instances
 *
 * Uses Firebase Storage as the data backend.
 *
 * @param session - Authenticated session with tokens and user
 * @param _sheets - Deprecated, kept for backward compatibility (not used)
 *
 * @example
 * const gsql = createGSQL(session);
 * const programs = await gsql.programs.findAll();
 */
export function createGSQL(
  session: AuthenticatedSession,
  _sheets?: GoogleSheets,
) {
  const { tokens, user } = session;
  if (!user?.email) {
    throw new Error("User email is required for GSQL");
  }
  const firebaseSheets = new FirebaseSheets(user.email);
  return new GSQL(tokens, firebaseSheets);
}

// Re-export types for consumers
export type { AuthTokens } from "./models/BaseModel.js";
export type {
  // Body Weight
  BodyWeightEntry,
  CreateBodyWeightInput,
  // Program Models
  Set,
  SetType,
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
  // User Exercises
  UserExercise,
  CreateUserExerciseInput,
} from "./types.js";
