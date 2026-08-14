export interface Exercise {
  name: string
  sets: number
  reps: number
  rir: number
}

export interface Workout {
  name: string
  exercises: Exercise[]
}

export interface Program {
  name: string
  workouts: Workout[]
}
