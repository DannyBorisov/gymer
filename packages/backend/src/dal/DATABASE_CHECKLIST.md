# Database Integration Checklist (dev only)

Connecting Postgres for the Onboarding feature. Dev environment only for now.

## 1. Docker Compose (dev) — 3 containers

- [x] `docker-compose.yml` at repo root: `frontend`, `backend`, `db` (postgres:16-alpine)
- [x] `packages/frontend/Dockerfile.dev` (Vite dev server, port 5173)
- [x] `packages/backend/Dockerfile.dev` (tsx watch, port 3002)
- [x] Named volume for postgres data (`gymerr_pgdata`)
- [x] `db` healthcheck; `backend` waits for it (`depends_on: condition: service_healthy`)
- [x] Host port 5433→5432 (avoids clash with a local Postgres); compose network uses `db:5432`

## 2. Prisma

- [x] Added `prisma` + `@prisma/client` (^6.1.0) to `packages/backend`
- [x] `packages/backend/prisma/schema.prisma` — postgres datasource + client generator
- [x] `Goal` enum: `LOSE_FAT | BUILD_MUSCLE | MAINTAIN | GAIN_STRENGTH`
- [x] `Gender` enum: `MALE | FEMALE | OTHER`
- [x] `Onboarding` model: `id`, `userEmail @unique`, `weight`, `height`, `age`, `gender`, `goal`, `isComplete`, timestamps
- [x] `AiTip` model (moved off Google Sheets): `id`, `userEmail`, `programName`, `workoutName`, `tip`, `createdAt`, `@@index([userEmail, createdAt])`
- [x] Migrations: `20260907231703_init`, `20260909105947_add_aitip_and_iscomplete`
- [x] `postinstall` + `build` run `prisma generate`

## 3. DAL split

- [x] Moved existing DAL → `src/dal/gsql/` (models, schemas, utils, `gsql.ts`, types)
- [x] `src/dal/index.ts` re-exports GSQL surface + `prisma` (external imports unchanged)
- [x] `src/dal/types.ts` shim re-exports `./gsql/types.js`
- [x] Postgres layer at `src/dal/postgres/` (renamed from `dal/prisma/` — Prisma is the ORM, not the DB)
- [x] `src/dal/postgres/client.ts` — singleton `PrismaClient` (dev-safe global)
- [x] `src/dal/postgres/OnboardingModel.ts` — `get(email)`, `upsert(email, data)`
- [x] `src/dal/postgres/AiTipModel.ts` — `findRecent(email, limit)`, `create(email, data)`
- [x] `src/dal/postgres/index.ts` — `prisma.onboarding` + `prisma.aiTips` namespaces + enum re-exports
- [x] Removed `AiTipsModel` / `aiTips` schema / `AiTip` types from `dal/gsql` entirely
- [x] `handlers/ai.ts` now uses `prisma.aiTips` (keyed on `user.email`)
- [x] `app.ts` `onClose` → `prisma.$disconnect()`
- [x] Fixed deep imports in `handlers/analytics.ts`, `handlers/workouts.ts` (`dal/gsql/utils/...`)

## 4. Onboarding persistence

- [x] `weight: Float`, `height: Float`, `age: Int`, `gender: Gender`, `goal: Goal`
- [x] Keyed on `userEmail` from `getAuthSession(request).user.email`
- [x] Upsert semantics — verified: create → read → re-upsert keeps `id`/`createdAt`

## 5. Route + handler + frontend API

- [x] `src/handlers/onboarding.ts` — `getOnboarding`, `saveOnboarding` (zod-validated body)
- [x] `src/routes/onboarding.ts` — `GET /api/onboarding`, `PUT /api/onboarding` (requireAuth)
- [x] Registered in `src/routes/index.ts` (`prefix: "/onboarding"`)
- [x] `packages/frontend/src/api/onboarding.ts` — `useGetOnboarding`, `useSaveOnboarding`

## 6. Single component using the API

- [x] `packages/frontend/src/components/OnboardingForm/` — `useGetOnboarding` + `useSaveOnboarding`, nothing else
- [x] `packages/frontend/src/pages/OnboardingSetup/` — thin page wrapping the form; navigates `/home` on save
- [x] `OnboardingGate` in `Routes.tsx` — on app open, `isComplete` true → app; false → redirect `/onboarding`

## 7. Env vars

- [x] `DATABASE_URL` added to `config.ts` zod schema (required)
- [x] `packages/backend/.env` + `.env.local` + root `.env.example`
- [x] compose sets `DATABASE_URL=postgresql://gymerr:gymerr@db:5432/gymerr?schema=public` for `backend`

## Verify

- [x] `docker compose up -d db` — healthy
- [x] `prisma migrate` applied; `Onboarding` table + `Goal`/`Gender` enums exist in DB
- [x] `tsc` passes — backend and frontend
- [x] Backend boots; `/api/health` ok; `/api/onboarding` → 401 unauthenticated
- [x] `prisma.onboarding` + `prisma.aiTips` round-trip against live DB (get/upsert, create/findRecent, `isComplete`)
- [ ] End-to-end through the UI (needs a logged-in session in a running app)

## Docker dev environment — notes

- Base image is `node:22-slim` (Debian), **not** alpine. Alpine (musl) forces `firebase-admin`/grpc
  to compile from source, which needs a `gcc`/`g++`/`make` toolchain — `apk add` of that alone
  took ~3 min per uncached build (this was the "npm i stuck forever" symptom). Debian gets
  prebuilt glibc binaries, so `npm ci` needs no compiler.
- Dockerfiles copy **all** workspace manifests (`backend`, `frontend`, `shared`) + `package-lock.json`
  so `npm ci` can resolve the workspace graph. Missing `packages/shared/package.json` made `npm ci`
  fail with a lockfile-mismatch.
- node_modules live in named volumes (`root_node_modules`, `backend_node_modules`,
  `frontend_node_modules`) so a host `node_modules` (wrong platform, or absent) can't shadow the
  image's install. Only `src/` (+ a few config files) is bind-mounted for hot reload.
- `AiTip` history is now per-user in Postgres. Tips that lived in users' Google Sheets are not
  migrated — history starts fresh.
