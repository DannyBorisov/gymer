// ============ Body Weight ============
export interface BodyWeightEntry {
  date: Date;
  weight: number;
}

export interface CreateBodyWeightInput {
  weight: number;
  date?: Date; // Defaults to today
}

// ============ User Exercises ============
export interface UserExercise {
  name: string;
  muscleGroup: string;
}

export interface CreateUserExerciseInput {
  name: string;
  muscleGroup: string;
}

// ============ Program Models ============

export interface Set {
  targetReps: number;
  targetRir: string;
  targetRestTime?: number;
  achievedWeight?: number;
  achievedReps?: number;
  achievedRir?: string;
  achievedRestTime?: number;
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
  achievedRestTime?: number;
  notes?: string;
}

export interface WorkoutUpdateData {
  date?: Date | string; // string when arriving as JSON over the wire
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
  targetRestTime?: number;
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
  date?: string; // local wall-clock ISO (YYYY-MM-DDTHH:MM:SS); defaults to now
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
  rir?: number; // Reps in reserve (0 = failure, higher = easier)
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

// ============ Analytics Summary ============

export interface AnalyticsSummary {
  strengthChange: {
    percentChange: number;
    periodWeeks: number;
    direction: "up" | "down" | "stable";
  };
  volumeChange: {
    percentChange: number;
    periodWeeks: number;
    direction: "up" | "down" | "stable";
  };
  consistency: {
    workoutsThisWeek: number;
    workoutsThisMonth: number;
  };
}

// ============ Personal Records ============

export interface RepPR {
  weight: number;
  date: string;
}

export interface ExerciseRecords {
  exercise: string;
  records: {
    e1rm: { value: number; date: string; weight: number; reps: number };
    maxWeight: { value: number; date: string; reps: number };
    repPRs: Record<number, RepPR>;
  };
  recentPRs: Array<{
    type: "e1rm" | "weight" | "reps";
    value: number;
    date: string;
    description: string;
  }>;
}

// ============ Muscle Group Volume ============

export interface MuscleGroupVolumeEntry {
  muscleGroup: string;
  sets: number;
  volume: number;
}

export interface MuscleGroupVolume {
  period: "week" | "month";
  groups: MuscleGroupVolumeEntry[];
}

// ============ Workout Consistency ============

export interface WeeklyHistoryEntry {
  weekStart: string;
  workoutsCompleted: number;
}

export interface WorkoutConsistency {
  totalWorkouts: number;
  workoutsThisWeek: number;
  workoutsThisMonth: number;
  streak: number;
  weeklyHistory: WeeklyHistoryEntry[];
}

// ============ Muscle Recovery ============

export interface MuscleRecoveryEntry {
  muscleGroup: string;
  fatiguePercent: number; // 0-100, 100 = fully fatigued
  hoursToRecovery: number;
  lastTrained: string | null; // ISO date string
  sets: number; // sets in last 72 hours
}

