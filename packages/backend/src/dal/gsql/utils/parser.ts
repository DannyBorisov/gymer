import type {
  Program,
  Workout,
  Exercise,
  Set,
  BodyWeightEntry,
} from '../types.js';
import { ProgramSchema } from '../schemas/program.js';
import { BodyWeightSchema } from '../schemas/bodyWeight.js';
import { parseDate, isDuration, isDateFormat } from './dateUtils.js';

// Internal type with rowIndex for update operations
export interface SetWithRowIndex extends Set {
  rowIndex: number;
}

export interface ExerciseWithRowIndex extends Omit<Exercise, 'sets'> {
  sets: SetWithRowIndex[];
}

export interface WorkoutWithRowIndex extends Omit<Workout, 'exercises'> {
  exercises: ExerciseWithRowIndex[];
}

export interface ProgramWithRowIndex extends Omit<Program, 'workouts'> {
  workouts: WorkoutWithRowIndex[];
}

/**
 * Parse "Exercise Name (Variant)" → { name, variant }
 */
export function parseExerciseName(fullName: string): { name: string; variant?: string } {
  const match = fullName.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    return { name: match[1].trim(), variant: match[2].trim() };
  }
  return { name: fullName.trim() };
}

/**
 * Format exercise name with variant for storage
 */
export function formatExerciseName(name: string, variant?: string): string {
  if (variant?.trim()) {
    return `${name} (${variant.trim()})`;
  }
  return name;
}

/**
 * Parse raw program rows into structured Program object
 * Returns internal type with rowIndex for update operations
 */
export function parseProgramRows(
  rows: string[][],
  programId: string,
  programName: string
): ProgramWithRowIndex {
  const cols = ProgramSchema.columns;

  // Map: week -> workout name -> { exercises, date, duration }
  type WorkoutData = {
    exercises: Map<string, SetWithRowIndex[]>;
    date?: Date;
    duration?: string;
  };
  const workoutsMap = new Map<string, WorkoutData>(); // key: `${week}:${workoutName}`

  let currentDate: Date | undefined;
  let currentDuration: string | undefined;
  let currentWorkout: string | undefined;
  let maxWeek = 0;

  // Skip header row (index 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const dateOrDuration = String(row[cols.date.index] || '').trim();
    const weekNum = Number(row[cols.week.index]) || 0;
    const workoutName = String(row[cols.workout.index] || '').trim();
    const exerciseName = String(row[cols.exercise.index] || '').trim();
    const setNum = Number(row[cols.set.index]) || 0;

    if (weekNum > maxWeek) maxWeek = weekNum;

    // Detect date vs duration in column A
    if (isDateFormat(dateOrDuration)) {
      currentDate = parseDate(dateOrDuration) || undefined;
      currentDuration = undefined;
      currentWorkout = workoutName;
    } else if (isDuration(dateOrDuration)) {
      currentDuration = dateOrDuration;
    } else if (workoutName && workoutName !== currentWorkout) {
      // New workout without date means not completed yet
      currentDate = undefined;
      currentDuration = undefined;
      currentWorkout = workoutName;
    }

    if (!weekNum || !workoutName || !exerciseName) continue;

    const workoutKey = `${weekNum}:${workoutName}`;

    // Initialize workout if needed
    if (!workoutsMap.has(workoutKey)) {
      workoutsMap.set(workoutKey, {
        exercises: new Map(),
        date: currentDate,
        duration: currentDuration,
      });
    }
    const workoutData = workoutsMap.get(workoutKey)!;

    // Update workout date/duration if we have newer info
    if (currentDate && currentWorkout === workoutName) {
      workoutData.date = currentDate;
    }
    if (currentDuration && currentWorkout === workoutName) {
      workoutData.duration = currentDuration;
    }

    // Initialize exercise if needed
    if (!workoutData.exercises.has(exerciseName)) {
      workoutData.exercises.set(exerciseName, []);
    }

    // Parse set data
    const weightStr = String(row[cols.weight.index] || '').trim();
    const repsStr = String(row[cols.repsAchieved.index] || '').trim();

    const set: SetWithRowIndex = {
      rowIndex: i + 1, // 1-indexed for sheets
      targetReps: Number(row[cols.targetReps.index]) || 0,
      targetRir: String(row[cols.rir.index] || ''),
      achievedWeight: weightStr ? parseFloat(weightStr) : undefined,
      achievedReps: repsStr ? parseInt(repsStr, 10) : undefined,
      achievedRir: String(row[cols.rirAchieved.index] || '') || undefined,
      notes: String(row[cols.notes.index] || '') || undefined,
    };

    workoutData.exercises.get(exerciseName)!.push(set);
  }

  // Convert to flat workouts array
  const workouts: WorkoutWithRowIndex[] = [];

  for (const [workoutKey, workoutData] of workoutsMap) {
    const [weekStr, workoutName] = workoutKey.split(':');
    const weekNum = parseInt(weekStr, 10);

    const exercises: ExerciseWithRowIndex[] = [];

    for (const [fullExerciseName, sets] of workoutData.exercises) {
      const { name, variant } = parseExerciseName(fullExerciseName);
      exercises.push({
        name,
        variant,
        sets: sets, // Already sorted by insertion order
      });
    }

    workouts.push({
      name: workoutName,
      week: weekNum,
      date: workoutData.date,
      duration: workoutData.duration,
      exercises,
    });
  }

  // Sort workouts by week, then by order of appearance
  workouts.sort((a, b) => a.week - b.week);

  // Calculate isComplete for the program
  const isComplete = workouts.length > 0 && workouts.every(workout =>
    workout.exercises.every(ex =>
      ex.sets.every(set => set.achievedWeight !== undefined && set.achievedReps !== undefined)
    )
  );

  return {
    id: programId,
    name: programName,
    numberOfWeeks: maxWeek,
    isComplete,
    workouts,
  };
}

/**
 * Strip rowIndex from internal types for external use
 */
export function stripRowIndex(program: ProgramWithRowIndex): Program {
  return {
    id: program.id,
    name: program.name,
    numberOfWeeks: program.numberOfWeeks,
    isComplete: program.isComplete,
    workouts: program.workouts.map(workout => ({
      name: workout.name,
      week: workout.week,
      date: workout.date,
      duration: workout.duration,
      exercises: workout.exercises.map(exercise => ({
        name: exercise.name,
        variant: exercise.variant,
        sets: exercise.sets.map(set => ({
          targetReps: set.targetReps,
          targetRir: set.targetRir,
          achievedWeight: set.achievedWeight,
          achievedReps: set.achievedReps,
          achievedRir: set.achievedRir,
          notes: set.notes,
        })),
      })),
    })),
  };
}

/**
 * Parse body weight rows
 */
export function parseBodyWeightRows(rows: string[][]): BodyWeightEntry[] {
  const cols = BodyWeightSchema.columns;
  const entries: BodyWeightEntry[] = [];

  // Skip header row (index 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const dateStr = String(row[cols.date.index] || '').trim();
    const weightStr = String(row[cols.weight.index] || '').trim();

    const date = parseDate(dateStr);
    const weight = parseFloat(weightStr);

    if (date && !isNaN(weight)) {
      entries.push({ date, weight });
    }
  }

  return entries;
}
