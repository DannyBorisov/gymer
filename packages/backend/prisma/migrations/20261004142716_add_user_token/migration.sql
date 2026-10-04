-- CreateTable
CREATE TABLE "UserToken" (
    "userEmail" TEXT NOT NULL,
    "encryptedTokens" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserToken_pkey" PRIMARY KEY ("userEmail")
);
