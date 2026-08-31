export const BodyWeightSchema = {
  sheetName: 'Gymerr Body Weight',
  appProperty: { key: 'gymerrBodyWeight', value: 'true' },
  columns: {
    date: { index: 0, column: 'A' },
    weight: { index: 1, column: 'B' },
  },
  headers: ['Date', 'Weight'],
} as const;
