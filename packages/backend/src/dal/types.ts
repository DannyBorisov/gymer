// ============ Body Weight ============
export interface BodyWeightEntry {
  date: Date;
  weight: number;
}

export interface CreateBodyWeightInput {
  weight: number;
  date?: Date; // Defaults to today
}

// ============ Program Models ============

export interface Set {
  targetReps: number;
  targetRir: string;
  achievedWeight?: number;
  achievedReps?: number;
  achievedRir?: string;
  notes?: string;
}

export interface Exercise {
  name: string;
  variant?: string;
  sets: Set[];
}

export interface Workout {
  name: string;
  week: number;
  date?: Date;
  duration?: string; // "H:MM:SS" format
  exercises: Exercise[];
}

export interface Program {
  id: string;
  name: string;
  numberOfWeeks: number;
  isComplete: boolean;
  workouts: Workout[];
}

export interface ProgramSummary {
  id: string;
  name: string;
  createdTime?: Date;
  url: string;
}

// ============ Where Clauses (Prisma-like) ============

export interface ExerciseWhere {
  name: string;
  set?: number; // Set index (0-based)
}

export interface WorkoutWhere {
  name: string;
  exercise?: ExerciseWhere;
}

export interface ProgramWhere {
  week: number;
  workout?: WorkoutWhere;
}

// ============ Update Data ============

export interface SetUpdateData {
  achievedWeight?: number;
  achievedReps?: number;
  achievedRir?: string;
  notes?: string;
}

export interface WorkoutUpdateData {
  date?: Date;
  duration?: string;
}

export interface ProgramUpdateInput {
  where: ProgramWhere;
  data: SetUpdateData | WorkoutUpdateData;
}

// ============ Create Program ============

export interface CreateProgramExercise {
  name: string;
  variant?: string;
  sets: number;
  reps: number;
  rir: number;
  customRir?: boolean;
}

export interface CreateProgramWorkout {
  name: string;
  exercises: CreateProgramExercise[];
}

export interface CreateProgramInput {
  name: string;
  durationWeeks: number;
  frequency: number | "every-other-day";
  dynamicRir: boolean;
  startingRir: number;
  workouts: CreateProgramWorkout[];
}

// ============ Quick Workouts ============

export interface QuickWorkoutSet {
  exercise: string;
  set: number;
  weight: number;
  reps: number;
  rir?: string;
  notes?: string;
}

export interface QuickWorkout {
  id: string;
  date: Date;
  duration?: string;
  sets: QuickWorkoutSet[];
}

export interface CreateQuickWorkoutInput {
  workoutId: string;
  duration: string;
  sets: {
    exercise: string;
    set: number;
    weight: string;
    reps: string;
    rir: string;
    notes: string;
  }[];
}

// ============ Analytics ============

export interface CompletedSet {
  date: Date;
  exercise: string;
  weight: number;
  reps: number;
}

export interface ExerciseBest {
  weight: number;
  reps: number;
  e1rm: number;
}

export interface ExerciseProgressionEntry {
  date: Date;
  weight: number;
  reps: number;
  sets: number;
  e1rm: number;
}

export interface ExerciseProgression {
  exercise: string;
  entries: ExerciseProgressionEntry[];
}
