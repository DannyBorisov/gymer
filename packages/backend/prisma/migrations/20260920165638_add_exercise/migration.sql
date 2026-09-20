-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('ABS', 'BACK', 'BICEPS', 'CHEST', 'LEGS', 'SHOULDERS', 'TRICEPS');

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "muscleGroup" "MuscleGroup" NOT NULL,
    "variant" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);
