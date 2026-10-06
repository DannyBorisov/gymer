export const ExerciseSchema = {
  sheetName: 'ikkos Exercises',
  appProperty: { key: 'ikkosExercises', value: 'true' },
  columns: {
    name: { index: 0, column: 'A' },
    muscleGroup: { index: 1, column: 'B' },
  },
  headers: ['Name', 'Muscle Group'],
} as const;
