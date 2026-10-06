export const BodyWeightSchema = {
  sheetName: 'ikkos Body Weight',
  appProperty: { key: 'ikkosBodyWeight', value: 'true' },
  columns: {
    date: { index: 0, column: 'A' },
    weight: { index: 1, column: 'B' },
  },
  headers: ['Date', 'Weight'],
} as const;
