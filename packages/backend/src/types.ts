// Program creation types
export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  rir: number;
}

export interface ProgramWorkout {
  name: string;
  exercises: Exercise[];
}

export type Frequency = 1 | 2 | 3 | 4 | 5 | 6 | 'every-other-day';

export interface Program {
  name: string;
  durationWeeks: number;
  frequency: Frequency;
  dynamicRir: boolean;
  startingRir: number;
  workouts: ProgramWorkout[];
}

// Spreadsheet row types (used during workout tracking)
export interface ExerciseRow {
  rowIndex: number;
  date: string;
  week: number;
  workout: string;
  exercise: string;
  set: number;
  targetReps: number;
  rir: string;
  weight: string;
  repsAchieved: string;
  rirAchieved: string;
  notes: string;
}

export interface WorkoutData {
  name: string;
  exercises: ExerciseRow[];
  isComplete: boolean;
  completedDate?: string;
}

export interface WeekData {
  week: number;
  workouts: WorkoutData[];
}

// API types
export interface UpdateRowsRequest {
  updates: {
    rowIndex: number;
    weight: string;
    repsAchieved: string;
    rirAchieved: string;
    notes: string;
  }[];
  completedDate?: string;
  dateRowIndex?: number;
}

export interface CreateProgramRequest {
  name: string;
  durationWeeks: number;
  frequency: Frequency;
  dynamicRir: boolean;
  startingRir: number;
  workouts: ProgramWorkout[];
}

export interface ProgramListItem {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
  url: string;
}

export interface UserInfo {
  email: string;
  name: string;
}
