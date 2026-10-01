-- CreateTable
CREATE TABLE "ProgramCache" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompletedSetCache" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "programId" TEXT,
    "exercise" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "rir" INTEGER,
    "restTime" INTEGER,

    CONSTRAINT "CompletedSetCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickWorkoutCache" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuickWorkoutCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgramCache_userEmail_idx" ON "ProgramCache"("userEmail");

-- CreateIndex
CREATE INDEX "CompletedSetCache_userEmail_exercise_idx" ON "CompletedSetCache"("userEmail", "exercise");

-- CreateIndex
CREATE INDEX "CompletedSetCache_userEmail_date_idx" ON "CompletedSetCache"("userEmail", "date");

-- CreateIndex
CREATE INDEX "CompletedSetCache_programId_idx" ON "CompletedSetCache"("programId");

-- CreateIndex
CREATE INDEX "QuickWorkoutCache_userEmail_idx" ON "QuickWorkoutCache"("userEmail");

-- CreateIndex
CREATE INDEX "QuickWorkoutCache_userEmail_date_idx" ON "QuickWorkoutCache"("userEmail", "date");
