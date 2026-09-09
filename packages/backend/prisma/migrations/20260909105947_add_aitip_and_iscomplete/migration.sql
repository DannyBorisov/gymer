-- AlterTable
ALTER TABLE "Onboarding" ADD COLUMN     "isComplete" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AiTip" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "workoutName" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiTip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiTip_userEmail_createdAt_idx" ON "AiTip"("userEmail", "createdAt");
