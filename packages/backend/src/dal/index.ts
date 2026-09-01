import type { GoogleSheets } from '../plugins/googleSheets.js';
import { BodyWeightModel } from './models/BodyWeightModel.js';
import { ProgramModel } from './models/ProgramModel.js';
import { QuickWorkoutModel } from './models/QuickWorkoutModel.js';
import { AnalyticsModel } from './models/AnalyticsModel.js';
import { AiTipsModel } from './models/AiTipsModel.js';
import type { AuthTokens } from './models/BaseModel.js';

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
 * ```
 */
export class GSQL {
  public readonly bodyWeight: BodyWeightModel;
  public readonly programs: ProgramModel;
  public readonly quickWorkouts: QuickWorkoutModel;
  public readonly analytics: AnalyticsModel;
  public readonly aiTips: AiTipsModel;

  constructor(tokens: AuthTokens, sheets: GoogleSheets) {
    this.bodyWeight = new BodyWeightModel(sheets, tokens);
    this.programs = new ProgramModel(sheets, tokens);
    this.quickWorkouts = new QuickWorkoutModel(sheets, tokens);
    this.analytics = new AnalyticsModel(sheets, tokens);
    this.aiTips = new AiTipsModel(sheets, tokens);
  }
}

/**
 * Factory function for creating GSQL instances
 */
export function createGSQL(tokens: AuthTokens, sheets: GoogleSheets): GSQL {
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
  // AI Tips
  AiTip,
  CreateAiTipInput,
} from './types.js';
