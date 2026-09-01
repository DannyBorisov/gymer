export const AiTipsSchema = {
  sheetName: 'Gymerr AI Tips',
  appProperty: { key: 'gymerrAiTips', value: 'true' },
  columns: {
    date: { index: 0, column: 'A' },
    programName: { index: 1, column: 'B' },
    workoutName: { index: 2, column: 'C' },
    tip: { index: 3, column: 'D' },
  },
  headers: ['Date', 'Program', 'Workout', 'Tip'],
} as const;
