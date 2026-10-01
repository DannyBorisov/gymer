import type { GoogleSheets } from '../../plugins/googleSheets.js';
import type { AuthenticatedSession } from '../../middlewares/auth.js';
import { CachedGoogleSheets } from '../cache/CachedGoogleSheets.js';
import { BodyWeightModel } from './models/BodyWeightModel.js';
import { ProgramModel } from './models/ProgramModel.js';
import { QuickWorkoutModel } from './models/QuickWorkoutModel.js';
import { AnalyticsModel } from './models/AnalyticsModel.js';
import { UserExerciseModel } from './models/UserExerciseModel.js';
import type { AuthTokens } from './models/BaseModel.js';

// Union type for sheets client (either direct or cached)
type SheetsClient = GoogleSheets | CachedGoogleSheets;

/**
 * GSQL - Google Sheets Query Language
 *
 * ORM-like data access layer for Google Sheets
 *
 * @example
 * ```typescript
 * const gsql = createGSQL(tokens, sheets);
 *
 * // Body Weight
 * const entries = await gsql.bodyWeight.findAll();
 * await gsql.bodyWeight.create({ weight: 75.5 });
 *
 * // Programs
 * const programs = await gsql.programs.findAll();
 * const program = await gsql.programs.find('spreadsheetId');
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

  constructor(tokens: AuthTokens, sheets: SheetsClient) {
    // Cast to GoogleSheets since CachedGoogleSheets has the same interface
    const sheetsClient = sheets as GoogleSheets;
    this.bodyWeight = new BodyWeightModel(sheetsClient, tokens);
    this.programs = new ProgramModel(sheetsClient, tokens);
    this.quickWorkouts = new QuickWorkoutModel(sheetsClient, tokens);
    this.analytics = new AnalyticsModel(sheetsClient, tokens);
    this.userExercises = new UserExerciseModel(sheetsClient, tokens);
  }
}

export interface CreateGSQLOptions {
  /** Whether to sync writes to Sheets immediately (default: false for cache-only) */
  syncToSheets?: boolean;
}

/**
 * Factory function for creating GSQL instances
 *
 * @param session - Authenticated session with tokens and user
 * @param sheets - GoogleSheets instance
 * @param options - Optional caching options
 *
 * @example
 * // With caching (reads from cache, writes to cache only)
 * const gsql = createGSQL(session, sheets);
 *
 * // With caching + sync to Sheets on writes
 * const gsql = createGSQL(session, sheets, { syncToSheets: true });
 */
export function createGSQL(
  session: AuthenticatedSession,
  sheets: GoogleSheets,
  options?: CreateGSQLOptions,
): GSQL {
  const { tokens, user } = session;
  if (user?.email) {
    const cachedSheets = new CachedGoogleSheets(sheets, user.email, {
      syncToSheets: options?.syncToSheets,
    });
    return new GSQL(tokens, cachedSheets);
  }
  return new GSQL(tokens, sheets);
}

// Re-export types for consumers
export type { AuthTokens } from './models/BaseModel.js';
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
  // User Exercises
  UserExercise,
  CreateUserExerciseInput,
} from './types.js';
