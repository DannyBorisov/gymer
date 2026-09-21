/*
  Warnings:

  - You are about to drop the `AiTip` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AiGenerationType" AS ENUM ('CreateProgram', 'CouchCue', 'PlateauAdvice');

-- DropTable
DROP TABLE "AiTip";

-- CreateTable
CREATE TABLE "AiGeneration" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "type" "AiGenerationType" NOT NULL,
    "content" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiGeneration_userEmail_date_idx" ON "AiGeneration"("userEmail", "date");
