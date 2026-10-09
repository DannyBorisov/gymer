/*
  Warnings:

  - You are about to drop the `CompletedSetCache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProgramCache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuickWorkoutCache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SheetCache` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "CompletedSetCache";

-- DropTable
DROP TABLE "ProgramCache";

-- DropTable
DROP TABLE "QuickWorkoutCache";

-- DropTable
DROP TABLE "SheetCache";

-- CreateTable
CREATE TABLE "UserExercise" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "muscleGroup" "MuscleGroup" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserExercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserExercise_userEmail_idx" ON "UserExercise"("userEmail");

-- CreateIndex
CREATE UNIQUE INDEX "UserExercise_userEmail_name_key" ON "UserExercise"("userEmail", "name");
