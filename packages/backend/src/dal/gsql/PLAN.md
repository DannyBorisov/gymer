# DAL (Data Access Layer) for Google Sheets

## Overview

Create a type-safe ORM-like layer that wraps Google Sheets, providing clean database operations with parsed/typed returns.

## Usage Example

```typescript
// Initialize with tokens
const gsql = new GSQL(tokens, sheetsClient);

// Body Weight operations
const allEntries = await gsql.bodyWeight.findAll();
// Returns: BodyWeightEntry[] = [{ date: Date, weight: number }, ...]

const entry = await gsql.bodyWeight.find(new Date('2024-01-15'));
// Returns: BodyWeightEntry | null

await gsql.bodyWeight.create({ weight: 75.5 });
// Creates entry with today's date

await gsql.bodyWeight.update(new Date('2024-01-15'), { weight: 76.0 });

// Program operations
const programs = await gsql.programs.findAll();
// Returns: ProgramSummary[] = [{ id, name, createdTime, modifiedTime }, ...]

const program = await gsql.programs.find('spreadsheetId123');
// Returns: Program with parsed workouts, exercises, variants, etc.

// Update a single set (hierarchical where/data pattern)
await gsql.programs.update('spreadsheetId123', {
  where: {
    week: 1,
    workout: {
      name: 'Upper',
      exercise: {
        name: 'Bench Press',
        set: 0
      }
    }
  },
  data: { weight: 100, reps: 10, rir: '2', notes: 'Felt strong' }
});

// Complete a workout (workout-level update)
await gsql.programs.update('spreadsheetId123', {
  where: {
    week: 1,
    workout: { name: 'Upper' }
  },
  data: { completedDate: new Date(), duration: '1:23:45' }
});

// Batch update multiple sets
await gsql.programs.updateMany('spreadsheetId123', [
  {
    where: { week: 1, workout: { name: 'Upper', exercise: { name: 'Bench Press', set: 0 } } },
    data: { weight: 100, reps: 10 }
  },
  {
    where: { week: 1, workout: { name: 'Upper', exercise: { name: 'Bench Press', set: 1 } } },
    data: { weight: 100, reps: 8 }
  },
]);
```

## File Structure

```
packages/backend/src/dal/
├── index.ts              # GSQL class - main entry point
├── types.ts              # All TypeScript interfaces
├── schemas/
│   ├── index.ts          # Export all schemas
│   ├── bodyWeight.ts     # Body weight column definitions
│   └── program.ts        # Program column definitions
├── models/
│   ├── index.ts          # Export all models
│   ├── BaseModel.ts      # Abstract base with common functionality
│   ├── BodyWeightModel.ts
│   └── ProgramModel.ts
└── utils/
    ├── index.ts          # Export all utils
    ├── parser.ts         # Parse raw rows → typed objects
    ├── serializer.ts     # Typed objects → sheet rows
    └── dateUtils.ts      # Date parsing/formatting (DD/MM/YYYY)
```

## Type Definitions (`types.ts`)

```typescript
// ============ Body Weight ============
export interface BodyWeightEntry {
  date: Date;
  weight: number;
}

export interface CreateBodyWeightInput {
  weight: number;
  date?: Date; // Defaults to today
}

// ============ Program ============
export interface ProgramSummary {
  id: string;
  name: string;
  createdTime?: Date;
  modifiedTime?: Date;
  url: string;
}

export interface Program {
  id: string;
  name: string;
  weeks: Week[];
}

export interface Week {
  weekNumber: number;
  workouts: Workout[];
}

export interface Workout {
  name: string;
  date?: Date;
  duration?: string; // "H:MM:SS" format
  isComplete: boolean;
  exercises: Exercise[];
}

export interface Exercise {
  name: string;           // Parsed name without variant
  variant?: string;       // Parsed from "Name (Variant)"
  week: number;           // Week number this exercise belongs to
  sets: ExerciseSet[];
}

export interface ExerciseSet {
  rowIndex: number;       // For updates
  setNumber: number;
  targetReps: number;
  targetRir: string;
  weight?: number;
  repsAchieved?: number;
  rirAchieved?: string;
  notes?: string;
}

// ============ Update Operations (Prisma-like) ============

// Hierarchical where clause: week → workout → exercise → set
export interface SetWhereClause {
  name: string;
  set: number;
}

export interface ExerciseWhereClause {
  name: string;
  exercise?: SetWhereClause;  // Drill down to set
}

export interface WorkoutWhereClause {
  name: string;
  exercise?: ExerciseWhereClause;  // Drill down to exercise/set
}

export interface ProgramWhereClause {
  week: number;
  workout?: WorkoutWhereClause;  // Drill down to workout/exercise/set
}

// Data for set-level updates
export interface SetUpdateData {
  weight?: number;
  reps?: number;
  rir?: string;
  notes?: string;
}

// Data for workout-level updates
export interface WorkoutUpdateData {
  completedDate?: Date;
  duration?: string;
}

// Combined update input
export interface ProgramUpdateInput {
  where: ProgramWhereClause;
  data: SetUpdateData | WorkoutUpdateData;
}

/*
Usage examples:

// Set-level update
{
  where: {
    week: 1,
    workout: {
      name: 'Upper',
      exercise: {
        name: 'Bench Press',
        set: 0
      }
    }
  },
  data: { weight: 100, reps: 10 }
}

// Workout-level update (complete)
{
  where: {
    week: 1,
    workout: { name: 'Upper' }
  },
  data: { completedDate: new Date(), duration: '1:23:45' }
}
*/
```

## Schema Definitions

### `schemas/bodyWeight.ts`
```typescript
export const BodyWeightSchema = {
  sheetName: 'Gymerr Body Weight',
  appProperty: { key: 'gymerrBodyWeight', value: 'true' },
  columns: {
    date: { index: 0, column: 'A' },
    weight: { index: 1, column: 'B' },
  },
  headers: ['Date', 'Weight'],
} as const;
```

### `schemas/program.ts`
```typescript
export const ProgramSchema = {
  appProperty: { key: 'createdBy', value: 'gymerr' },
  columns: {
    date: { index: 0, column: 'A' },
    week: { index: 1, column: 'B' },
    workout: { index: 2, column: 'C' },
    exercise: { index: 3, column: 'D' },
    set: { index: 4, column: 'E' },
    targetReps: { index: 5, column: 'F' },
    rir: { index: 6, column: 'G' },
    weight: { index: 7, column: 'H' },
    repsAchieved: { index: 8, column: 'I' },
    rirAchieved: { index: 9, column: 'J' },
    notes: { index: 10, column: 'K' },
  },
  headers: ['Date', 'Week', 'Workout', 'Exercise', 'Set', 'Target Reps', 'RIR', 'Weight', 'Reps Achieved', 'RIR Achieved', 'Notes'],
} as const;
```

## Utils

### `utils/dateUtils.ts`
```typescript
// Parse DD/MM/YYYY to Date
export function parseDate(str: string): Date | null

// Format Date to DD/MM/YYYY
export function formatDate(date: Date): string

// Check if string is duration format (H:MM:SS)
export function isDuration(str: string): boolean
```

### `utils/parser.ts`
```typescript
// Parse "Exercise Name (Variant)" → { name, variant }
export function parseExerciseName(fullName: string): { name: string; variant?: string }

// Parse raw program rows into structured Program object
export function parseProgramRows(rows: string[][], programId: string, programName: string): Program

// Parse body weight rows
export function parseBodyWeightRows(rows: string[][]): BodyWeightEntry[]
```

### `utils/serializer.ts`
```typescript
// Convert Exercise to sheet rows
export function serializeExercise(exercise: Exercise, week: number, workout: string): string[][]

// Format exercise name with variant
export function formatExerciseName(name: string, variant?: string): string
```

## Model Implementations

### `models/BaseModel.ts`
```typescript
export abstract class BaseModel {
  constructor(
    protected sheets: GoogleSheets,
    protected tokens: AuthTokens
  ) {}

  protected async findSheet(query: string): Promise<string | null>
  protected async getOrCreateSheet(name: string, appProps: object, headers: string[]): Promise<string>
}
```

### `models/BodyWeightModel.ts`
```typescript
export class BodyWeightModel extends BaseModel {
  async findAll(): Promise<BodyWeightEntry[]>
  async find(date: Date): Promise<BodyWeightEntry | null>
  async create(input: CreateBodyWeightInput): Promise<BodyWeightEntry>
  async update(date: Date, input: { weight: number }): Promise<BodyWeightEntry>
  async upsert(input: CreateBodyWeightInput): Promise<BodyWeightEntry>
}
```

### `models/ProgramModel.ts`
```typescript
export class ProgramModel extends BaseModel {
  async findAll(): Promise<ProgramSummary[]>
  async find(id: string): Promise<Program | null>
  async create(input: CreateProgramInput): Promise<ProgramSummary>

  // Unified update with where/data pattern
  async update(id: string, input: ProgramUpdateInput): Promise<void>
  // Examples:
  //   Set-level:     { where: { week: 1, workout: 'Upper', exercise: 'Bench', setIndex: 0 }, data: { weight: 100 } }
  //   Workout-level: { where: { week: 1, workout: 'Upper' }, data: { completedDate: new Date(), duration: '1:23:45' } }

  // Batch updates
  async updateMany(id: string, inputs: ProgramUpdateInput[]): Promise<void>

  async delete(id: string): Promise<void>
}
```

## Main Entry Point (`index.ts`)

```typescript
import { GoogleSheets } from '../plugins/googleSheets';
import { BodyWeightModel } from './models/BodyWeightModel';
import { ProgramModel } from './models/ProgramModel';

export class GSQL {
  public readonly bodyWeight: BodyWeightModel;
  public readonly programs: ProgramModel;

  constructor(tokens: AuthTokens, sheets: GoogleSheets) {
    this.bodyWeight = new BodyWeightModel(sheets, tokens);
    this.programs = new ProgramModel(sheets, tokens);
  }
}

// Factory function for Fastify integration
export function createGSQL(tokens: AuthTokens, sheets: GoogleSheets): GSQL {
  return new GSQL(tokens, sheets);
}
```

## Implementation Order

1. **Phase 1: Foundation**
   - [ ] `types.ts` - All interfaces
   - [ ] `utils/dateUtils.ts` - Date helpers
   - [ ] `utils/parser.ts` - Parsing functions
   - [ ] `schemas/` - Column definitions

2. **Phase 2: Body Weight Model**
   - [ ] `models/BaseModel.ts`
   - [ ] `models/BodyWeightModel.ts`
   - [ ] Test with existing body weight handler

3. **Phase 3: Program Model**
   - [ ] `models/ProgramModel.ts`
   - [ ] `utils/serializer.ts`
   - [ ] Test with existing program handlers

4. **Phase 4: Integration**
   - [ ] `index.ts` - GSQL class
   - [ ] Fastify plugin for easy access

## Key Parsing Logic

### Program Row Grouping
```
Raw rows → Group by week → Group by workout → Group by exercise → Array of sets
```

### Exercise Name Parsing
```
"Lat Pulldown (Wide Grip)" → { name: "Lat Pulldown", variant: "Wide Grip" }
"Bench Press" → { name: "Bench Press", variant: undefined }
```

### Workout Completion Detection
```
A workout is complete when ALL its exercise sets have:
- weight !== ""
- repsAchieved !== ""
```

### Date/Duration Detection
Column A can contain:
- Date: "DD/MM/YYYY" or "DD/MM/YYYY, HH:MM"
- Duration: "H:MM:SS" (appears in row below date)
- Empty: ""

## Notes

- The DAL does NOT modify existing handlers - it's a standalone module
- Handlers can gradually migrate to use GSQL
- All date strings in sheets use DD/MM/YYYY format
- Tokens are passed once at GSQL construction, not per-method
- Each program remains a separate spreadsheet (existing architecture)
