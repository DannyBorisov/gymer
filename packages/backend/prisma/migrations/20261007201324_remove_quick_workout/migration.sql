/*
  Warnings:

  - You are about to drop the `QuickWorkout` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuickWorkoutSet` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "QuickWorkoutSet" DROP CONSTRAINT "QuickWorkoutSet_workoutId_fkey";

-- DropTable
DROP TABLE "QuickWorkout";

-- DropTable
DROP TABLE "QuickWorkoutSet";
