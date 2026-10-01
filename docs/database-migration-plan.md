# Database Migration Plan: Google Sheets → PostgreSQL

## Executive Summary

Move all program/workout data reads from Google Sheets to PostgreSQL. Sheets become a write-only archive synced after workout completion.

---

## Schema Design

### Design Principles (Ponytail)

1. **Flat over nested** - No JSON blobs that need parsing
2. **One source of truth** - DB is authoritative, Sheets is export
3. **Query-friendly** - All analytics queries should be simple SQL
4. **Minimal tables** - Only what's needed, no premature abstraction

### New Tables

```prisma
// Program template - the "plan" created by user
model UserProgram {
  id            String   @id @default(cuid())
  userEmail     String
  sheetId       String?  // Google Sheet ID (for export)
  name          String
  durationWeeks Int
  frequency     String   // "1"-"6" or "every-other-day"
  dynamicRir    Boolean  @default(false)
  startingRir   Int      @default(3)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  workouts ProgramWorkout[]

  @@index([userEmail])
  @@index([sheetId])
}

// Workout template within a program (e.g., "Push Day", "Pull Day")
// One row per unique workout NAME (not per week)
model ProgramWorkout {
  id        String @id @default(cuid())
  programId String
  name      String
  orderIndex Int   // Display order within program

  program   UserProgram @relation(fields: [programId], references: [id], onDelete: Cascade)
  exercises ProgramExercise[]

  @@unique([programId, name])
  @@index([programId])
}

// Exercise template within a workout
model ProgramExercise {
  id             String  @id @default(cuid())
  workoutId      String
  name           String
  variant        String?
  sets           Int
  targetReps     Int
  targetRir      Int
  targetRestTime Int?    // seconds
  orderIndex     Int     // Display order within workout

  workout ProgramWorkout @relation(fields: [workoutId], references: [id], onDelete: Cascade)

  @@index([workoutId])
}

// Completed workout session - one row per workout INSTANCE
model CompletedWorkout {
  id          String   @id @default(cuid())
  userEmail   String
  programId   String?  // null for quick workouts
  programName String?  // denormalized for history display
  workoutName String
  week        Int?     // null for quick workouts
  date        DateTime
  duration    Int      // seconds

  sets CompletedSet[]

  @@index([userEmail, date])
  @@index([programId, week, workoutName])
}

// Individual set logged during workout
model CompletedSet {
  id              String  @id @default(cuid())
  workoutId       String
  exercise        String  // Full name (includes variant if any)
  setNumber       Int     // 1-based
  targetReps      Int?
  targetRir       Int?
  achievedWeight  Float?
  achievedReps    Int?
  achievedRir     Int?
  achievedRestTime Int?   // seconds
  notes           String?

  workout CompletedWorkout @relation(fields: [workoutId], references: [id], onDelete: Cascade)

  @@index([workoutId])
  @@index([exercise])  // For progression queries
}

// Body weight tracking (already separate, keeping as-is pattern)
model BodyWeight {
  id        String   @id @default(cuid())
  userEmail String
  date      DateTime
  weight    Float

  @@index([userEmail, date])
}
```

---

## How Each Feature Maps to New Schema

### 1. Home Page
**Current**: Fetches full program from Sheets, calculates streak/progress
**New**:
- `UserProgram` + `ProgramWorkout` → program structure
- `CompletedWorkout` WHERE programId = X → progress calculation
- `CompletedWorkout` WHERE userEmail = X ORDER BY date → streak

### 2. Active Workout
**Current**: Reads program from Sheets, writes sets to Sheets every 5s
**New**:
- Read: `UserProgram` + `ProgramWorkout` + `ProgramExercise` → structure
- Read: `CompletedWorkout` + `CompletedSet` WHERE same workout, previous week → "last time" stats
- Write: Insert `CompletedWorkout` + `CompletedSet` on completion
- **During workout**: Temporary state in memory (WorkoutContext), save to DB on completion only
- **Auto-save removed** - No more 5s interval writes. Save once on completion.

### 3. Analytics - Progression
**Current**: `getAllCompletedSets()` called 7x, loops in memory
**New**:
```sql
SELECT exercise, date, MAX(achievedWeight) as weight, MAX(achievedReps) as reps
FROM CompletedSet cs
JOIN CompletedWorkout cw ON cs.workoutId = cw.id
WHERE cw.userEmail = ?
GROUP BY exercise, DATE(date)
ORDER BY exercise, date
```

### 4. Analytics - Recovery
**Current**: Complex in-memory calculation
**New**:
```sql
SELECT cs.exercise, e.muscleGroup, cw.date, COUNT(*) as sets
FROM CompletedSet cs
JOIN CompletedWorkout cw ON cs.workoutId = cw.id
JOIN Exercise e ON e.name = cs.exercise
WHERE cw.userEmail = ? AND cw.date > NOW() - INTERVAL '7 days'
GROUP BY cs.exercise, e.muscleGroup, cw.date
```

### 5. Analytics - Volume by Muscle Group
**Current**: Maps exercise → muscle group in code, aggregates
**New**:
```sql
SELECT e.muscleGroup, COUNT(*) as sets,
       SUM(cs.achievedWeight * cs.achievedReps) as volume
FROM CompletedSet cs
JOIN CompletedWorkout cw ON cs.workoutId = cw.id
JOIN Exercise e ON e.name = cs.exercise
WHERE cw.userEmail = ? AND cw.date > NOW() - INTERVAL '7 days'
GROUP BY e.muscleGroup
```

### 6. Workout History
**Current**: Fetches all programs, flattens workouts
**New**:
```sql
SELECT * FROM CompletedWorkout
WHERE userEmail = ?
ORDER BY date DESC
```

### 7. Quick Workouts
**Current**: Separate QuickWorkout model/sheet
**New**: Same `CompletedWorkout` table with `programId = NULL, week = NULL`

### 8. Program CRUD
**Create**: Insert `UserProgram` + `ProgramWorkout` + `ProgramExercise`, then async create Sheet
**Edit**: Update DB tables, async update Sheet
**Delete**: Delete from DB, async delete Sheet
**Copy**: Clone DB rows with new IDs

---

## Migration Path

### Phase 1: Add Tables + Dual Write (Week 1)
1. Add new Prisma models
2. Run migration
3. On program create: write to both DB and Sheets
4. On workout complete: write to both DB and Sheets
5. Reads still from Sheets

### Phase 2: Backfill Existing Data (Week 1-2)
1. Script to read all Sheets programs → insert into DB
2. Script to read all completed sets → insert into DB
3. Verify data integrity

### Phase 3: Switch Reads to DB (Week 2)
1. Update all handlers to read from DB
2. Remove Sheets read calls
3. Keep Sheets write for export

### Phase 4: Remove Auto-Save (Week 3)
1. Active workout saves to memory only during workout
2. Single save on workout completion
3. No more 5-second interval writes
4. Sheets sync becomes background job after completion

### Phase 5: Make Sheets Optional (Week 4)
1. Sheets export becomes user preference
2. Users without Sheets still fully functional
3. Sheets sync failures don't block user

---

## Data Flow After Migration

```
                    ┌─────────────────┐
                    │   Frontend      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   API Server    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼────────┐     │     ┌────────▼────────┐
     │   PostgreSQL    │     │     │  Google Sheets  │
     │   (Primary)     │     │     │  (Archive Only) │
     │                 │     │     │                 │
     │ - All reads     │     │     │ - Write on      │
     │ - All writes    │     │     │   workout done  │
     │ - Fast queries  │     │     │ - Background    │
     │                 │     │     │ - Optional      │
     └─────────────────┘     │     └─────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Background Job │
                    │  (Sheet Sync)   │
                    └─────────────────┘
```

---

## Benefits

1. **No quota issues** - DB has no read/write limits
2. **Fast analytics** - SQL aggregations vs. in-memory loops
3. **Reliable** - PostgreSQL ACID vs. eventual consistency
4. **Simpler code** - Remove Sheet parsing logic
5. **Offline capable** - DB works without Google API
6. **Quick workouts unified** - Same table as program workouts

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Run dual-write for 2 weeks before switching |
| Sheet sync failures | Queue failed syncs, retry with backoff, alert user |
| Existing programs not migrated | Lazy migration on first access + batch script |
| Schema changes needed later | Design indexes for known query patterns upfront |

---

## Questions for Review

1. **Auto-save removal**: Currently saves every 5s during workout. New plan saves only on completion. Acceptable? (App crash = lost workout data)
   - Alternative: Save to local storage during workout, sync to DB on completion

2. **Sheets as optional**: Should new users even get a Sheet? Or make it opt-in "export to Sheet" feature?

3. **Quick workout unification**: Current plan merges into same CompletedWorkout table. Any reason to keep separate?

4. **Exercise name normalization**: CompletedSet stores raw exercise name. Should we FK to Exercise table instead? (Complicates custom exercises)
