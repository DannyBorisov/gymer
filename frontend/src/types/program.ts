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

export type Frequency = 1 | 2 | 3 | 4 | 5 | 6 | 'every-other-day'

export interface Program {
  name: string
  durationWeeks: number
  frequency: Frequency
  dynamicRir: boolean
  startingRir: number
  workouts: Workout[]
}
