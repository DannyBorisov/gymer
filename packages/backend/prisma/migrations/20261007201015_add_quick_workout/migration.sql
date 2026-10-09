-- CreateTable
CREATE TABLE "QuickWorkout" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "duration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuickWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickWorkoutSet" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "exercise" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "rir" TEXT,
    "notes" TEXT,

    CONSTRAINT "QuickWorkoutSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuickWorkout_userEmail_idx" ON "QuickWorkout"("userEmail");

-- CreateIndex
CREATE INDEX "QuickWorkout_userEmail_date_idx" ON "QuickWorkout"("userEmail", "date");

-- CreateIndex
CREATE INDEX "QuickWorkoutSet_workoutId_idx" ON "QuickWorkoutSet"("workoutId");

-- AddForeignKey
ALTER TABLE "QuickWorkoutSet" ADD CONSTRAINT "QuickWorkoutSet_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "QuickWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
