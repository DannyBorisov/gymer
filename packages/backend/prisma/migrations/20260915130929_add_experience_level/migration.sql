/*
  Warnings:

  - Added the required column `experienceLevel` to the `Onboarding` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- AlterTable
ALTER TABLE "Onboarding" ADD COLUMN     "experienceLevel" "ExperienceLevel" NOT NULL DEFAULT 'INTERMEDIATE';

-- Existing rows only: drop the default so future inserts must supply a value.
ALTER TABLE "Onboarding" ALTER COLUMN "experienceLevel" DROP DEFAULT;
