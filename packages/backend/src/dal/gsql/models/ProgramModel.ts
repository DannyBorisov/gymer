import { BaseModel } from "./BaseModel.js";
import { ProgramSchema } from "../schemas/program.js";
import {
  parseProgramRows,
  stripRowIndex,
  formatExerciseName,
  type ProgramWithRowIndex,
} from "../utils/parser.js";
import {
  formatDateTime,
  parseDate,
  isDateFormat,
  isDuration,
} from "../utils/dateUtils.js";
import type {
  Program,
  ProgramSummary,
  ProgramUpdateInput,
  CreateProgramInput,
  SetUpdateData,
  WorkoutUpdateData,
  CompletedSet,
} from "../types.js";

/** Achieved data for one previously-logged set, keyed for lookup during edits. */
interface AchievedSetData {
  achievedWeight?: number;
  achievedReps?: number;
  achievedRir?: string;
  notes?: string;
}

/** Logged date/duration for one previously-recorded workout occurrence. */
interface AchievedWorkoutData {
  date?: string; // already-formatted sheet cell value
  duration?: string;
}

/**
 * Looks up previously-logged progress by (week, workout name, exercise name,
 * 0-based set index) / (week, workout name), so `buildProgramRows` can carry
 * it over into regenerated rows during an edit. `create()` passes an empty
 * lookup since there is nothing to carry over yet.
 */
interface AchievedDataLookup {
  set(
    week: number,
    workoutName: string,
    exerciseName: string,
    setIndex: number,
  ): AchievedSetData | undefined;
  workout(week: number, workoutName: string): AchievedWorkoutData | undefined;
}

const emptyAchievedDataLookup: AchievedDataLookup = {
  set: () => undefined,
  workout: () => undefined,
};

/**
 * Build a lookup of previously-logged achieved data from an existing parsed
 * program, so an edit can carry it over onto the regenerated rows for any
 * (week, workout, exercise, set) that still exists with the same identity
 * after the edit. Workouts/exercises that were renamed, reordered, or
 * removed simply won't match anything here — their history is not carried
 * over, by design (see ProgramModel.editStructure).
 */
function buildAchievedDataLookup(
  program: ProgramWithRowIndex,
): AchievedDataLookup {
  const setMap = new Map<string, AchievedSetData>();
  const workoutMap = new Map<string, AchievedWorkoutData>();

  for (const workout of program.workouts) {
    if (workout.date || workout.duration) {
      workoutMap.set(`${workout.week}:${workout.name}`, {
        date: workout.date ? formatDateTime(workout.date) : undefined,
        duration: workout.duration,
      });
    }
    for (const exercise of workout.exercises) {
      const exerciseName = formatExerciseName(exercise.name, exercise.variant);
      exercise.sets.forEach((set, setIndex) => {
        if (
          set.achievedWeight === undefined &&
          set.achievedReps === undefined &&
          set.achievedRir === undefined &&
          !set.notes
        ) {
          return;
        }
        setMap.set(
          `${workout.week}:${workout.name}:${exerciseName}:${setIndex}`,
          {
            achievedWeight: set.achievedWeight,
            achievedReps: set.achievedReps,
            achievedRir: set.achievedRir,
            notes: set.notes,
          },
        );
      });
    }
  }

  return {
    set: (week, workoutName, exerciseName, setIndex) =>
      setMap.get(`${week}:${workoutName}:${exerciseName}:${setIndex}`),
    workout: (week, workoutName) => workoutMap.get(`${week}:${workoutName}`),
  };
}

/**
 * Generate the full set of data rows (no header) for a program template,
 * optionally carrying over previously-logged achieved data for any
 * (week, workout, exercise, set) found in `achieved`. Shared by `create()`
 * (empty lookup) and `editStructure()` (lookup built from the prior program)
 * so both produce byte-identical row layouts for the same template.
 */
function buildProgramRows(
  input: CreateProgramInput,
  achieved: AchievedDataLookup,
): (string | number)[][] {
  const rows: (string | number)[][] = [];
  const sessionsPerWeek =
    input.frequency === "every-other-day" ? 4 : input.frequency;

  for (let week = 1; week <= input.durationWeeks; week++) {
    let weekRir = input.startingRir;
    if (input.dynamicRir && input.durationWeeks > 1) {
      const rirDecrement = input.startingRir / (input.durationWeeks - 1);
      weekRir = Math.max(
        0,
        Math.round(input.startingRir - rirDecrement * (week - 1)),
      );
    }

    for (let session = 0; session < sessionsPerWeek; session++) {
      const workout = input.workouts[session % input.workouts.length];
      const workoutName =
        input.workouts.length < sessionsPerWeek
          ? `${workout.name} #${session + 1}`
          : workout.name;

      const achievedWorkout = achieved.workout(week, workoutName);
      let workoutRowNumber = 0; // 0-based position within this workout occurrence

      for (const exercise of workout.exercises) {
        const targetRir =
          input.dynamicRir && !exercise.customRir ? weekRir : exercise.rir;
        const rirDisplay =
          targetRir === 0 ? "To Failure" : targetRir.toString();
        const exerciseName = formatExerciseName(
          exercise.name,
          exercise.variant,
        );

        for (let set = 1; set <= exercise.sets; set++) {
          const setIndex = set - 1;
          const achievedSet = achieved.set(
            week,
            workoutName,
            exerciseName,
            setIndex,
          );

          // Date lives in column A of the workout's first row, duration in
          // column A of its second row — see updateWorkout/parseProgramRows.
          let dateColumn: string | number = "";
          if (workoutRowNumber === 0 && achievedWorkout?.date) {
            dateColumn = achievedWorkout.date;
          } else if (workoutRowNumber === 1 && achievedWorkout?.duration) {
            dateColumn = achievedWorkout.duration;
          }

          rows.push([
            dateColumn,
            week,
            workoutName,
            exerciseName,
            set,
            exercise.reps,
            rirDisplay,
            achievedSet?.achievedWeight ?? "",
            achievedSet?.achievedReps ?? "",
            achievedSet?.achievedRir ?? "",
            achievedSet?.notes ?? "",
          ]);
          workoutRowNumber++;
        }
      }
    }
  }

  return rows;
}

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
    } catch (err) {
      console.error(`[ProgramModel.findInternal] failed for ${id}:`, err);
      return null;
    }
  }

  /**
   * Create a new program
   */
  async create(input: CreateProgramInput): Promise<ProgramSummary> {
    const rows: (string | number)[][] = [
      [...ProgramSchema.headers],
      ...buildProgramRows(input, emptyAchievedDataLookup),
    ];

    // Create spreadsheet
    const spreadsheetId = await this.sheets.create(this.tokens, input.name);
    await this.sheets.setFileProperties(this.tokens, spreadsheetId, {
      [ProgramSchema.appProperty.key]: ProgramSchema.appProperty.value,
    });

    const { sheetName } = await this.sheets.getSpreadsheetMetadata(
      this.tokens,
      spreadsheetId,
    );
    await this.sheets.update(
      this.tokens,
      spreadsheetId,
      `${sheetName}!A1`,
      rows,
    );

    return {
      id: spreadsheetId,
      name: input.name,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  }

  /**
   * Replace a program's structure (name, duration, frequency, workouts,
   * exercises) with an edited template, regenerating every row the same way
   * `create()` does. Any previously-logged achieved data (weight, reps, RIR,
   * notes, workout date/duration) is carried over onto the new rows when it
   * still matches the same (week, workout name, exercise name, set index) —
   * so renaming/reordering/removing a workout or exercise, or changing set
   * counts, causes that specific history to no longer carry over, but
   * anything unchanged survives the edit.
   */
  async editStructure(
    id: string,
    input: CreateProgramInput,
  ): Promise<ProgramSummary> {
    const existing = await this.findInternal(id);
    if (!existing) throw new Error("Program not found");

    const achieved = buildAchievedDataLookup(existing);
    const rows: (string | number)[][] = [
      [...ProgramSchema.headers],
      ...buildProgramRows(input, achieved),
    ];

    if (input.name !== existing.name) {
      await this.sheets.renameFile(this.tokens, id, input.name);
    }

    const { sheetName } = await this.sheets.getSpreadsheetMetadata(
      this.tokens,
      id,
    );

    // Clear the whole data range first — the new template may generate
    // fewer rows than before, and a plain overwrite would leave stale rows
    // trailing past the new content.
    await this.sheets.clear(this.tokens, id, `${sheetName}!A2:K`);
    await this.sheets.update(this.tokens, id, `${sheetName}!A1`, rows);

    return {
      id,
      name: input.name,
      url: `https://docs.google.com/spreadsheets/d/${id}`,
    };
  }

  /**
   * Update program data using hierarchical where clause
   */
  async update(id: string, input: ProgramUpdateInput): Promise<void> {
    const program = await this.findInternal(id);
    if (!program) throw new Error("Program not found");

    const { sheetName } = await this.sheets.getSpreadsheetMetadata(
      this.tokens,
      id,
    );
    const { where, data } = input;

    // Find the target workout
    const workout = program.workouts.find(
      (w) =>
        w.week === where.week &&
        (!where.workout || w.name === where.workout.name),
    );
    if (!workout) {
      throw new Error(
        `Workout not found for week ${where.week}${where.workout ? ` name "${where.workout.name}"` : ""}`,
      );
    }

    // If no workout.exercise specified, this is workout-level update (date/duration)
    if (!where.workout?.exercise) {
      await this.updateWorkout(
        id,
        sheetName,
        workout,
        data as WorkoutUpdateData,
      );
      return;
    }

    // Find the exercise
    const exercise = workout.exercises.find(
      (e) =>
        e.name === where.workout!.exercise!.name ||
        formatExerciseName(e.name, e.variant) === where.workout!.exercise!.name,
    );
    if (!exercise) {
      throw new Error(
        `Exercise "${where.workout.exercise.name}" not found in workout "${where.workout.name}"`,
      );
    }

    // If set is specified, update single set
    if (where.workout.exercise.set !== undefined) {
      const set = exercise.sets[where.workout.exercise.set];
      if (!set) throw new Error(`Set ${where.workout.exercise.set} not found`);

      await this.updateSet(id, sheetName, set.rowIndex, data as SetUpdateData);
      return;
    }

    // No set specified - could update all sets (not implemented)
    throw new Error("Set index must be specified for set-level updates");
  }

  /**
   * Batch update multiple sets/workouts
   */
  async updateMany(id: string, inputs: ProgramUpdateInput[]): Promise<void> {
    const program = await this.findInternal(id);
    if (!program) throw new Error("Program not found");

    const { sheetName } = await this.sheets.getSpreadsheetMetadata(
      this.tokens,
      id,
    );
    const updates: { range: string; values: (string | number)[][] }[] = [];

    for (const input of inputs) {
      const { where, data } = input;

      // Find the target workout
      const workout = program.workouts.find(
        (w) =>
          w.week === where.week &&
          (!where.workout || w.name === where.workout.name),
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
        (e) =>
          e.name === where.workout!.exercise!.name ||
          formatExerciseName(e.name, e.variant) ===
            where.workout!.exercise!.name,
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
    data: WorkoutUpdateData,
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
    data: SetUpdateData,
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
        const { sheetName } = await this.sheets.getSpreadsheetMetadata(
          this.tokens,
          program.id,
        );
        const rows = await this.sheets.get(
          this.tokens,
          program.id,
          `${sheetName}!A:I`,
        );
        if (!rows || rows.length < 2) return;

        let currentDate: Date | null = null;
        let currentWorkout = "";

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const dateOrDuration = String(row[cols.date.index] || "").trim();
          const workout = String(row[cols.workout.index] || "").trim();
          const exercise = String(row[cols.exercise.index] || "").trim();
          const weightStr = String(row[cols.weight.index] || "").trim();
          const repsStr = String(row[cols.repsAchieved.index] || "").trim();

          // Track date
          if (isDateFormat(dateOrDuration)) {
            currentDate = parseDate(dateOrDuration);
            currentWorkout = workout;
          } else if (workout && workout !== currentWorkout) {
            currentDate = null;
            currentWorkout = workout;
          }

          if (!currentDate || !exercise || !weightStr || !repsStr) continue;

          const weight = +weightStr;
          const reps = +repsStr;

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
        const { sheetName } = await this.sheets.getSpreadsheetMetadata(
          this.tokens,
          program.id,
        );
        const rows = await this.sheets.get(
          this.tokens,
          program.id,
          `${sheetName}!D:D`,
        );
        if (!rows) return;

        for (let i = 1; i < rows.length; i++) {
          const name = String(rows[i][0] || "").trim();
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
   * Add one extra set to an exercise, for this occurrence only (this week's
   * workout) — not the exercise's other occurrences in later weeks.
   *
   * Inserts a real spreadsheet row directly below the exercise's last
   * existing set row in this workout, shifting every row below it (including
   * all later weeks) down by one. Since `findInternal`/`find` always
   * re-derive row positions from a fresh read, nothing else needs to change
   * for that shift to be picked up correctly on the next read.
   */
  async addSet(
    id: string,
    week: number,
    workoutName: string,
    exerciseName: string,
    targetReps?: number,
    targetRir?: string,
  ): Promise<void> {
    const { sheetName, sheetId } = await this.sheets.getSpreadsheetMetadata(
      this.tokens,
      id,
    );
    const rows = await this.sheets.get(this.tokens, id, `${sheetName}!A:K`);
    if (!rows || rows.length < 2) throw new Error("Program not found or empty");

    const cols = ProgramSchema.columns;

    // Find every row for this exercise, in this workout, in this week.
    const matchingRowNumbers: number[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowWeek = Number(row[cols.week.index]) || 0;
      const rowWorkout = String(row[cols.workout.index] || "").trim();
      const rowExercise = String(row[cols.exercise.index] || "").trim();
      if (
        rowWeek === week &&
        rowWorkout === workoutName &&
        rowExercise === exerciseName
      ) {
        matchingRowNumbers.push(i + 1); // 1-indexed sheet row
      }
    }

    if (matchingRowNumbers.length === 0) {
      throw new Error(
        `Exercise "${exerciseName}" not found in week ${week}, workout "${workoutName}"`,
      );
    }

    const lastRowNumber = Math.max(...matchingRowNumbers);
    const lastRow = rows[lastRowNumber - 1];
    const nextSetNumber = matchingRowNumbers.length + 1;
    const newRowNumber = lastRowNumber + 1;

    // Insert a blank row right after the exercise's last set, then fill it
    // in — with the caller's target reps/RIR if given, otherwise the same
    // values as the last set — and no achieved data yet.
    await this.sheets.insertRow(this.tokens, id, sheetId, newRowNumber);
    await this.sheets.update(this.tokens, id, `${sheetName}!A${newRowNumber}`, [
      [
        "", // Date
        week, // Week
        workoutName, // Workout
        exerciseName, // Exercise
        nextSetNumber, // Set
        targetReps ?? String(lastRow[cols.targetReps.index] || ""), // Target Reps
        targetRir ?? String(lastRow[cols.rir.index] || ""), // RIR
        "", // Weight
        "", // Reps Achieved
        "", // RIR Achieved
        "", // Notes
      ],
    ]);
  }

  /**
   * Delete a program
   */
  async delete(id: string): Promise<void> {
    await this.sheets.deleteFile(this.tokens, id);
  }

  /**
   * Duplicate a program as a clean, unstarted plan: same weeks, workouts,
   * exercises, sets, target reps, and target RIR, but with every achieved
   * weight/reps/RIR, note, and workout date/duration cleared — a copy is a
   * plan to run again, not a record of having already run it.
   */
  async copy(id: string): Promise<ProgramSummary> {
    const original = await this.findInternal(id);
    if (!original) throw new Error("Program not found");

    const originalName = await this.sheets.getFileName(this.tokens, id);
    const newName = `${originalName} (Copy)`;

    const rows: (string | number)[][] = [[...ProgramSchema.headers]];
    for (const workout of original.workouts) {
      for (const exercise of workout.exercises) {
        const exerciseName = formatExerciseName(exercise.name, exercise.variant);
        exercise.sets.forEach((set, setIndex) => {
          rows.push([
            "", // Date
            workout.week,
            workout.name,
            exerciseName,
            setIndex + 1,
            set.targetReps,
            set.targetRir,
            "", // Weight
            "", // Reps Achieved
            "", // RIR Achieved
            "", // Notes
          ]);
        });
      }
    }

    const newId = await this.sheets.create(this.tokens, newName);
    await this.sheets.setFileProperties(this.tokens, newId, {
      [ProgramSchema.appProperty.key]: ProgramSchema.appProperty.value,
    });

    const { sheetName } = await this.sheets.getSpreadsheetMetadata(
      this.tokens,
      newId,
    );
    await this.sheets.update(this.tokens, newId, `${sheetName}!A1`, rows);

    return {
      id: newId,
      name: newName,
      url: `https://docs.google.com/spreadsheets/d/${newId}`,
    };
  }

  /**
   * Rename a program
   */
  async rename(id: string, name: string): Promise<ProgramSummary> {
    await this.sheets.renameFile(this.tokens, id, name);

    return {
      id,
      name,
      url: `https://docs.google.com/spreadsheets/d/${id}`,
    };
  }
}
