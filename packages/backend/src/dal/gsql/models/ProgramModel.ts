import { BaseModel } from './BaseModel.js';
import { ProgramSchema } from '../schemas/program.js';
import {
  parseProgramRows,
  stripRowIndex,
  formatExerciseName,
  type ProgramWithRowIndex,
} from '../utils/parser.js';
import { formatDateTime, parseDate, isDateFormat, isDuration } from '../utils/dateUtils.js';
import type {
  Program,
  ProgramSummary,
  ProgramUpdateInput,
  CreateProgramInput,
  SetUpdateData,
  WorkoutUpdateData,
  CompletedSet,
} from '../types.js';

export class ProgramModel extends BaseModel {
  /**
   * Get all programs (summary only)
   */
  async findAll(): Promise<ProgramSummary[]> {
    const query = this.buildQuery(ProgramSchema.appProperty);
    const files = await this.sheets.listFiles(this.tokens, query);

    return files.map((file) => ({
      id: file.id,
      name: file.name,
      createdTime: file.createdTime ? new Date(file.createdTime) : undefined,
      url: `https://docs.google.com/spreadsheets/d/${file.id}`,
    }));
  }

  /**
   * Get a single program with full data
   */
  async find(id: string): Promise<Program | null> {
    const internal = await this.findInternal(id);
    return internal ? stripRowIndex(internal) : null;
  }

  /**
   * Internal find that preserves rowIndex for updates
   */
  private async findInternal(id: string): Promise<ProgramWithRowIndex | null> {
    try {
      const [{ sheetName }, programName] = await Promise.all([
        this.sheets.getSpreadsheetMetadata(this.tokens, id),
        this.sheets.getFileName(this.tokens, id),
      ]);

      const rows = await this.sheets.get(this.tokens, id, `${sheetName}!A:K`);
      if (!rows || rows.length < 2) return null;

      return parseProgramRows(rows as string[][], id, programName);
    } catch {
      return null;
    }
  }

  /**
   * Create a new program
   */
  async create(input: CreateProgramInput): Promise<ProgramSummary> {
    const rows: (string | number)[][] = [[...ProgramSchema.headers]];

    // Determine sessions per week
    const sessionsPerWeek = input.frequency === 'every-other-day' ? 4 : input.frequency;

    for (let week = 1; week <= input.durationWeeks; week++) {
      // Calculate RIR for this week if dynamic
      let weekRir = input.startingRir;
      if (input.dynamicRir && input.durationWeeks > 1) {
        const rirDecrement = input.startingRir / (input.durationWeeks - 1);
        weekRir = Math.max(0, Math.round(input.startingRir - rirDecrement * (week - 1)));
      }

      // Cycle through workouts
      for (let session = 0; session < sessionsPerWeek; session++) {
        const workout = input.workouts[session % input.workouts.length];
        const workoutName =
          input.workouts.length < sessionsPerWeek
            ? `${workout.name} #${session + 1}`
            : workout.name;

        for (const exercise of workout.exercises) {
          const targetRir =
            input.dynamicRir && !exercise.customRir ? weekRir : exercise.rir;
          const rirDisplay = targetRir === 0 ? 'To Failure' : targetRir.toString();
          const exerciseName = formatExerciseName(exercise.name, exercise.variant);

          for (let set = 1; set <= exercise.sets; set++) {
            rows.push([
              '',           // Date
              week,         // Week
              workoutName,  // Workout
              exerciseName, // Exercise
              set,          // Set
              exercise.reps,// Target Reps
              rirDisplay,   // RIR
              '',           // Weight
              '',           // Reps Achieved
              '',           // RIR Achieved
              '',           // Notes
            ]);
          }
        }
      }
    }

    // Create spreadsheet
    const spreadsheetId = await this.sheets.create(this.tokens, input.name);
    await this.sheets.setFileProperties(this.tokens, spreadsheetId, {
      [ProgramSchema.appProperty.key]: ProgramSchema.appProperty.value,
    });

    const { sheetName } = await this.sheets.getSpreadsheetMetadata(this.tokens, spreadsheetId);
    await this.sheets.update(this.tokens, spreadsheetId, `${sheetName}!A1`, rows);

    return {
      id: spreadsheetId,
      name: input.name,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  }

  /**
   * Update program data using hierarchical where clause
   */
  async update(id: string, input: ProgramUpdateInput): Promise<void> {
    const program = await this.findInternal(id);
    if (!program) throw new Error('Program not found');

    const { sheetName } = await this.sheets.getSpreadsheetMetadata(this.tokens, id);
    const { where, data } = input;

    // Find the target workout
    const workout = program.workouts.find(
      (w) => w.week === where.week && (!where.workout || w.name === where.workout.name)
    );
    if (!workout) {
      throw new Error(`Workout not found for week ${where.week}${where.workout ? ` name "${where.workout.name}"` : ''}`);
    }

    // If no workout.exercise specified, this is workout-level update (date/duration)
    if (!where.workout?.exercise) {
      await this.updateWorkout(id, sheetName, workout, data as WorkoutUpdateData);
      return;
    }

    // Find the exercise
    const exercise = workout.exercises.find(
      (e) => e.name === where.workout!.exercise!.name ||
             formatExerciseName(e.name, e.variant) === where.workout!.exercise!.name
    );
    if (!exercise) {
      throw new Error(`Exercise "${where.workout.exercise.name}" not found in workout "${where.workout.name}"`);
    }

    // If set is specified, update single set
    if (where.workout.exercise.set !== undefined) {
      const set = exercise.sets[where.workout.exercise.set];
      if (!set) throw new Error(`Set ${where.workout.exercise.set} not found`);

      await this.updateSet(id, sheetName, set.rowIndex, data as SetUpdateData);
      return;
    }

    // No set specified - could update all sets (not implemented)
    throw new Error('Set index must be specified for set-level updates');
  }

  /**
   * Batch update multiple sets/workouts
   */
  async updateMany(id: string, inputs: ProgramUpdateInput[]): Promise<void> {
    const program = await this.findInternal(id);
    if (!program) throw new Error('Program not found');

    const { sheetName } = await this.sheets.getSpreadsheetMetadata(this.tokens, id);
    const updates: { range: string; values: (string | number)[][] }[] = [];

    for (const input of inputs) {
      const { where, data } = input;

      // Find the target workout
      const workout = program.workouts.find(
        (w) => w.week === where.week && (!where.workout || w.name === where.workout.name)
      );
      if (!workout) continue;

      // Workout-level update
      if (!where.workout?.exercise) {
        const workoutData = data as WorkoutUpdateData;
        const firstSetRowIndex = workout.exercises[0]?.sets[0]?.rowIndex;
        if (!firstSetRowIndex) continue;

        if (workoutData.date) {
          updates.push({
            range: `${sheetName}!A${firstSetRowIndex}`,
            values: [[formatDateTime(workoutData.date)]],
          });
        }
        if (workoutData.duration) {
          updates.push({
            range: `${sheetName}!A${firstSetRowIndex + 1}`,
            values: [[workoutData.duration]],
          });
        }
        continue;
      }

      // Find exercise
      const exercise = workout.exercises.find(
        (e) => e.name === where.workout!.exercise!.name ||
               formatExerciseName(e.name, e.variant) === where.workout!.exercise!.name
      );
      if (!exercise) continue;

      // Set-level update
      if (where.workout.exercise.set !== undefined) {
        const set = exercise.sets[where.workout.exercise.set];
        if (!set) continue;

        const setData = data as SetUpdateData;
        const cols = ProgramSchema.columns;

        if (setData.achievedWeight !== undefined) {
          updates.push({
            range: `${sheetName}!${cols.weight.column}${set.rowIndex}`,
            values: [[setData.achievedWeight]],
          });
        }
        if (setData.achievedReps !== undefined) {
          updates.push({
            range: `${sheetName}!${cols.repsAchieved.column}${set.rowIndex}`,
            values: [[setData.achievedReps]],
          });
        }
        if (setData.achievedRir !== undefined) {
          updates.push({
            range: `${sheetName}!${cols.rirAchieved.column}${set.rowIndex}`,
            values: [[setData.achievedRir]],
          });
        }
        if (setData.notes !== undefined) {
          updates.push({
            range: `${sheetName}!${cols.notes.column}${set.rowIndex}`,
            values: [[setData.notes]],
          });
        }
      }
    }

    if (updates.length > 0) {
      await this.sheets.batchUpdate(this.tokens, id, updates);
    }
  }

  /**
   * Update a workout's date and/or duration
   */
  private async updateWorkout(
    spreadsheetId: string,
    sheetName: string,
    workout: { exercises: { sets: { rowIndex: number }[] }[] },
    data: WorkoutUpdateData
  ): Promise<void> {
    // Find the first row of this workout (where date goes)
    const firstSetRowIndex = workout.exercises[0]?.sets[0]?.rowIndex;
    if (!firstSetRowIndex) return;

    const updates: { range: string; values: (string | number)[][] }[] = [];

    if (data.date) {
      updates.push({
        range: `${sheetName}!A${firstSetRowIndex}`,
        values: [[formatDateTime(data.date)]],
      });
    }

    if (data.duration) {
      // Duration goes in the row below the date
      updates.push({
        range: `${sheetName}!A${firstSetRowIndex + 1}`,
        values: [[data.duration]],
      });
    }

    if (updates.length > 0) {
      await this.sheets.batchUpdate(this.tokens, spreadsheetId, updates);
    }
  }

  /**
   * Update a single set's data
   */
  private async updateSet(
    spreadsheetId: string,
    sheetName: string,
    rowIndex: number,
    data: SetUpdateData
  ): Promise<void> {
    const cols = ProgramSchema.columns;
    const updates: { range: string; values: (string | number)[][] }[] = [];

    if (data.achievedWeight !== undefined) {
      updates.push({
        range: `${sheetName}!${cols.weight.column}${rowIndex}`,
        values: [[data.achievedWeight]],
      });
    }

    if (data.achievedReps !== undefined) {
      updates.push({
        range: `${sheetName}!${cols.repsAchieved.column}${rowIndex}`,
        values: [[data.achievedReps]],
      });
    }

    if (data.achievedRir !== undefined) {
      updates.push({
        range: `${sheetName}!${cols.rirAchieved.column}${rowIndex}`,
        values: [[data.achievedRir]],
      });
    }

    if (data.notes !== undefined) {
      updates.push({
        range: `${sheetName}!${cols.notes.column}${rowIndex}`,
        values: [[data.notes]],
      });
    }

    if (updates.length > 0) {
      await this.sheets.batchUpdate(this.tokens, spreadsheetId, updates);
    }
  }

  /**
   * Get all completed sets from all programs for analytics
   */
  async getCompletedSets(): Promise<CompletedSet[]> {
    const programs = await this.findAll();
    const cols = ProgramSchema.columns;
    const allSets: CompletedSet[] = [];

    const fetchPromises = programs.map(async (program) => {
      try {
        const { sheetName } = await this.sheets.getSpreadsheetMetadata(this.tokens, program.id);
        const rows = await this.sheets.get(this.tokens, program.id, `${sheetName}!A:I`);
        if (!rows || rows.length < 2) return;

        let currentDate: Date | null = null;
        let currentWorkout = '';

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const dateOrDuration = String(row[cols.date.index] || '').trim();
          const workout = String(row[cols.workout.index] || '').trim();
          const exercise = String(row[cols.exercise.index] || '').trim();
          const weightStr = String(row[cols.weight.index] || '').trim();
          const repsStr = String(row[cols.repsAchieved.index] || '').trim();

          // Track date
          if (isDateFormat(dateOrDuration)) {
            currentDate = parseDate(dateOrDuration);
            currentWorkout = workout;
          } else if (workout && workout !== currentWorkout) {
            currentDate = null;
            currentWorkout = workout;
          }

          if (!currentDate || !exercise || !weightStr || !repsStr) continue;

          const weight = parseFloat(weightStr);
          const reps = parseInt(repsStr, 10);

          if (weight > 0 && reps > 0) {
            allSets.push({ date: currentDate, exercise, weight, reps });
          }
        }
      } catch {
        // Skip failed fetches
      }
    });

    await Promise.all(fetchPromises);
    return allSets;
  }

  /**
   * Get all unique exercise names from all programs
   */
  async getExerciseNames(): Promise<string[]> {
    const programs = await this.findAll();
    const exercises = new Set<string>();

    const fetchPromises = programs.map(async (program) => {
      try {
        const { sheetName } = await this.sheets.getSpreadsheetMetadata(this.tokens, program.id);
        const rows = await this.sheets.get(this.tokens, program.id, `${sheetName}!D:D`);
        if (!rows) return;

        for (let i = 1; i < rows.length; i++) {
          const name = String(rows[i][0] || '').trim();
          if (name) exercises.add(name);
        }
      } catch {
        // Skip failed fetches
      }
    });

    await Promise.all(fetchPromises);
    return Array.from(exercises);
  }

  /**
   * Delete a program
   */
  async delete(id: string): Promise<void> {
    // Note: This would require Drive API delete permission
    // For now, we don't implement actual deletion
    throw new Error('Delete not implemented - use Google Drive directly');
  }
}
