export const ExerciseSchema = {
  sheetName: 'Gymerr Exercises',
  appProperty: { key: 'gymerrExercises', value: 'true' },
  columns: {
    name: { index: 0, column: 'A' },
    muscleGroup: { index: 1, column: 'B' },
  },
  headers: ['Name', 'Muscle Group'],
} as const;
