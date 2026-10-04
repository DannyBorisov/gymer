-- CreateTable
CREATE TABLE "SheetCache" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "spreadsheetId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "needsSync" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "SheetCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SheetCache_userEmail_idx" ON "SheetCache"("userEmail");

-- CreateIndex
CREATE INDEX "SheetCache_needsSync_idx" ON "SheetCache"("needsSync");

-- CreateIndex
CREATE UNIQUE INDEX "SheetCache_userEmail_spreadsheetId_key" ON "SheetCache"("userEmail", "spreadsheetId");
