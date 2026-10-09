# Plan: Replace Google Sheets + Cache with Firebase Storage

## Goal
Replace the dual-layer architecture (Google Sheets API + PostgreSQL cache) with a single Firebase Storage layer to eliminate quota issues and simplify the codebase.

## Architecture

```
App (read/write) → Firebase Storage
                   users/{email}/sheets/{name}.json

Cloud Function (one-way sync) → Google Sheets (backup/export only)
```

**Key Points:**
- App ONLY talks to Firebase Storage (no quota limits)
- Google Sheets are never read by the app
- Cloud Function periodically syncs Firebase Storage → Google Sheets
- Users can view their data in Google Sheets (read-only export)

## Storage Structure
```
users/
  {user_email}/
    sheets/
      _index.json          # List of all sheets with metadata
      quick-workouts.json  # Quick workout data
      body-weight.json     # Body weight entries
      {program-name}.json  # Program data (one file per program)
```

## Implementation Status

### ✅ Completed

1. **Firebase Storage Service** (`src/dal/firebase/FirebaseStorage.ts`)
   - Low-level Firebase Storage operations
   - Read/write JSON files
   - Index management for sheet lists

2. **FirebaseSheets Adapter** (`src/dal/firebase/FirebaseSheets.ts`)
   - Same interface as GoogleSheets
   - GSQL models work unchanged
   - All operations go to Firebase Storage

3. **Updated GSQL Factory** (`src/dal/gsql/gsql.ts`)
   - Uses FirebaseSheets instead of CachedGoogleSheets
   - Removed syncToSheets option (no longer needed)

4. **Updated Handlers**
   - Removed `{ syncToSheets: true/false }` from all handlers
   - Both updateProgram and updateProgramCache now do the same thing

5. **Updated Config** (`src/config.ts`)
   - Added FIREBASE_STORAGE_BUCKET env variable

6. **Updated Cloud Function** (`packages/functions/sheets-sync`)
   - Now reads from Firebase Storage instead of PostgreSQL
   - Syncs all user sheets to Google Sheets
   - Added firebase-admin dependency

### 🔲 TODO

1. **Add FIREBASE_STORAGE_BUCKET to .env files**
   - Development: `.env`
   - Production: Cloud Run secrets

2. **Remove Old Cache Code** (optional cleanup)
   - `src/dal/cache/CachedGoogleSheets.ts`
   - `src/dal/cache/SheetCache.ts`
   - `src/dal/postgres/ProgramCacheModel.ts`
   - Remove cache tables from Prisma schema

3. **Migration Script** (for existing users)
   - Read data from Google Sheets
   - Write to Firebase Storage
   - One-time migration per user

4. **Test the flow end-to-end**
   - Create program → saved to Firebase Storage
   - Cloud Function runs → synced to Google Sheets
   - View in Google Sheets → data visible

## Environment Variables Needed

```bash
# Add to .env
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

## Rollback Plan
- Keep GoogleSheets plugin code (still used for auth and Cloud Function sync)
- Can revert GSQL factory to use CachedGoogleSheets if issues arise
