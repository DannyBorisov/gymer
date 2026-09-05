# Gymerr Copilot Instructions

## Repository and commands

Gymerr is an npm-workspaces monorepo. Install dependencies from the repository root with `npm install`; workspace packages are `@gymerr/shared`, `@gymerr/backend`, and `@gymerr/frontend`.

| Task | Command |
| --- | --- |
| Run the web app | `npm run dev:frontend` |
| Run the API | `npm run dev:backend` |
| Build all workspaces in dependency order | `npm run build` |
| Build one workspace | `npm run build:backend` or `npm run build:frontend` |
| Build shared contracts only | `npm run build -w @gymerr/shared` |
| Lint the frontend | `npm run lint -w @gymerr/frontend` |
| Sync the built web bundle to iOS | `npm run deploy:ios` |
| Run Android unit tests | `cd packages/frontend/android && ./gradlew testDebugUnitTest` |
| Run one Android unit test | `cd packages/frontend/android && ./gradlew testDebugUnitTest --tests 'com.getcapacitor.myapp.ExampleUnitTest'` |

There is no JavaScript/TypeScript test runner or `test` npm script. The tracked Android tests are Capacitor starter tests; add or run targeted tests appropriate to the affected platform.

## Architecture

- **Frontend (`packages/frontend`)** is a Vite React SPA shared by web, iOS, and Android. `main.tsx` renders `App`, which nests React Query, routing, and the Auth, Settings, Workout, and QuickWorkout providers. `Routes.tsx` keeps the active program workout mounted as a `WorkoutDrawer` overlay: `/workout` renders Home behind it, while the drawer owns `ActiveWorkout`.
- **API (`packages/backend`)** is Fastify. `app.ts` registers cookie/CORS support and Google Sheets, Firestore, and Gemini plugins, then mounts OAuth endpoints at `/auth` and application endpoints at `/api`. Route modules compose authentication middleware with handlers; handlers obtain the per-request Sheets facade through `createGSQL(tokens, this.sheets)`.
- **Persistence is split by purpose.** Firestore stores user profile records keyed by email. Workout programs, quick workouts, body-weight entries, and AI tips are Google Sheets/Drive files owned by the authenticated user. The DAL models in `backend/src/dal/models` create, locate, parse, and update those sheets through `GoogleSheets`.
- **Authentication has two transports.** Web OAuth stores the encrypted session in an HTTP-only cookie; native OAuth returns an encrypted `sessionToken` saved in `localStorage` and sends it through the authorization header. The frontend API modules must use `api/index.ts`'s `request()` helper so both transports and Capacitor native HTTP work consistently.
- **Native functionality is part of the React app contract.** Capacitor builds from `packages/frontend/dist`. The TypeScript `Sound` plugin interface in `src/plugins/sound.ts` must stay aligned with Android `SoundPlugin.kt` (registered in `MainActivity.java`) and iOS `SoundPlugin.swift`. iOS Live Activities are driven from `src/utils/liveActivity.ts` and the `LiveActivitiesWidget` extension.

## Conventions and invariants

- Keep changes minimal and local. Surface a meaningful ambiguity instead of silently choosing a broad design; do not refactor adjacent code unless the requested change requires it.
- Backend TypeScript is ESM and uses explicit `.js` extensions for local runtime imports. Maintain that convention in backend source.
- Add frontend server calls in the feature-specific module under `src/api/`. Pair React Query hooks with stable query keys and invalidate the relevant keys after mutations. Do not introduce new callers of the legacy `src/utils/api.ts`; current API code uses `request()` from `src/api/index.ts`.
- Protect new user-data API routes with `requireAuth`, retrieve credentials with `getAuthSession(request)`, and pass the resulting Google OAuth tokens to `createGSQL`. The session is encrypted by `lib/encryption.ts`; never expose its tokens in responses.
- Google Sheets schemas are a storage contract, not display-only metadata. Keep column indexes, A1 column letters, headers, parsers, and model updates synchronized. Program rows use 1-based sheet `rowIndex`; API update `where.workout.exercise.set` is 0-based. Column A encodes either a workout date or its duration, and parser behavior depends on that format.
- Programs are identified in Drive through `appProperties` (`createdBy=gymerr`); quick workouts and body weight use their own sheet properties. Use the existing schema constants and `BaseModel` helpers rather than duplicating queries or creating untagged files.
- Workout and quick-workout timers calculate elapsed time from a start timestamp rather than incrementing state, preserving accuracy after backgrounding. Keep their wake-lock, autosave/recovery, rest-notification, and Live Activity cleanup flows intact when changing workout lifecycle code.
- Web API configuration comes from `VITE_API_URL`; native clients intentionally call the production API. Backend startup validates its required environment through `config.ts`; use `.env.example` only as the local starting point and do not commit secrets.
