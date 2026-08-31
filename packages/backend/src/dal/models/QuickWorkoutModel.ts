import { BaseModel } from './BaseModel.js';
import { QuickWorkoutSchema } from '../schemas/quickWorkout.js';
import { formatDate, parseDate, isDateFormat } from '../utils/dateUtils.js';
import type {
  QuickWorkout,
  QuickWorkoutSet,
  CreateQuickWorkoutInput,
  CompletedSet,
} from '../types.js';

export class QuickWorkoutModel extends BaseModel {
  /**
   * Get or create the quick workouts sheet
   */
  private async getSheetId(): Promise<string | null> {
    const spreadsheetId = await this.findSheet(QuickWorkoutSchema.appProperty);
    return spreadsheetId;
  }

  /**
   * Find all quick workouts
   */
  async findAll(): Promise<QuickWorkout[]> {
    const spreadsheetId = await this.getSheetId();
    if (!spreadsheetId) return [];

    const sheetName = await this.getSheetName(spreadsheetId);
    const rows = await this.sheets.get(this.tokens, spreadsheetId, `${sheetName}!A:I`);
    if (!rows || rows.length < 2) return [];

    const cols = QuickWorkoutSchema.columns;
    const workoutsMap = new Map<string, QuickWorkout>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const dateStr = String(row[cols.date.index] || '').trim();
      const workoutId = String(row[cols.workoutId.index] || '').trim();
      const exercise = String(row[cols.exercise.index] || '').trim();
      const setNum = Number(row[cols.set.index]) || 1;
      const weightStr = String(row[cols.weight.index] || '').trim();
      const repsStr = String(row[cols.reps.index] || '').trim();
      const rir = String(row[cols.rir.index] || '').trim();
      const notes = String(row[cols.notes.index] || '').trim();
      const duration = String(row[cols.duration.index] || '').trim();

      if (!workoutId) continue;

      if (!workoutsMap.has(workoutId)) {
        const date = parseDate(dateStr) || new Date();
        workoutsMap.set(workoutId, {
          id: workoutId,
          date,
          duration: duration || undefined,
          sets: [],
        });
      }

      const workout = workoutsMap.get(workoutId)!;
      if (dateStr && isDateFormat(dateStr)) {
        workout.date = parseDate(dateStr) || workout.date;
      }
      if (duration && !workout.duration) {
        workout.duration = duration;
      }

      if (exercise) {
        workout.sets.push({
          exercise,
          set: setNum,
          weight: parseFloat(weightStr) || 0,
          reps: parseInt(repsStr, 10) || 0,
          rir: rir || undefined,
          notes: notes || undefined,
        });
      }
    }

    return Array.from(workoutsMap.values());
  }

  /**
   * Find a specific quick workout by ID
   */
  async find(id: string): Promise<QuickWorkout | null> {
    const workouts = await this.findAll();
    return workouts.find(w => w.id === id) || null;
  }

  /**
   * Create a new quick workout
   */
  async create(input: CreateQuickWorkoutInput): Promise<QuickWorkout> {
    const spreadsheetId = await this.getOrCreateSheet(
      QuickWorkoutSchema.sheetName,
      QuickWorkoutSchema.appProperty,
      [...QuickWorkoutSchema.headers]
    );

    const sheetName = await this.getSheetName(spreadsheetId);
    const today = new Date();
    const dateStr = formatDate(today);

    const rows: (string | number)[][] = input.sets.map((set, index) => [
      index === 0 ? dateStr : '',
      input.workoutId,
      set.exercise,
      set.set,
      set.weight,
      set.reps,
      set.rir,
      set.notes,
      index === 0 ? input.duration : '',
    ]);

    await this.sheets.appendRows(this.tokens, spreadsheetId, `${sheetName}!A:I`, rows);

    return {
      id: input.workoutId,
      date: today,
      duration: input.duration,
      sets: input.sets.map(s => ({
        exercise: s.exercise,
        set: s.set,
        weight: parseFloat(s.weight) || 0,
        reps: parseInt(s.reps, 10) || 0,
        rir: s.rir || undefined,
        notes: s.notes || undefined,
      })),
    };
  }

  /**
   * Get all completed sets for analytics
   */
  async getCompletedSets(): Promise<CompletedSet[]> {
    const spreadsheetId = await this.getSheetId();
    if (!spreadsheetId) return [];

    const sheetName = await this.getSheetName(spreadsheetId);
    const rows = await this.sheets.get(this.tokens, spreadsheetId, `${sheetName}!A:F`);
    if (!rows || rows.length < 2) return [];

    const cols = QuickWorkoutSchema.columns;
    const sets: CompletedSet[] = [];
    let currentDate: Date | null = null;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const dateStr = String(row[cols.date.index] || '').trim();
      const exercise = String(row[cols.exercise.index] || '').trim();
      const weightStr = String(row[cols.weight.index] || '').trim();
      const repsStr = String(row[cols.reps.index] || '').trim();

      if (isDateFormat(dateStr)) {
        currentDate = parseDate(dateStr);
      }

      if (!currentDate || !exercise || !weightStr || !repsStr) continue;

      const weight = parseFloat(weightStr);
      const reps = parseInt(repsStr, 10);

      if (weight > 0 && reps > 0) {
        sets.push({ date: currentDate, exercise, weight, reps });
      }
    }

    return sets;
  }

  /**
   * Get all unique exercise names
   */
  async getExerciseNames(): Promise<string[]> {
    const spreadsheetId = await this.getSheetId();
    if (!spreadsheetId) return [];

    const sheetName = await this.getSheetName(spreadsheetId);
    const rows = await this.sheets.get(this.tokens, spreadsheetId, `${sheetName}!C:C`);
    if (!rows || rows.length < 2) return [];

    const exercises = new Set<string>();
    for (let i = 1; i < rows.length; i++) {
      const name = String(rows[i][0] || '').trim();
      if (name) exercises.add(name);
    }

    return Array.from(exercises);
  }
}
