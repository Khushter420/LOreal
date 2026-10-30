CREATE TYPE "AssessmentStatus" AS ENUM ('JUSTIFIED', 'NOT_JUSTIFIED', 'INSUFFICIENT_EVIDENCE');

CREATE TABLE "Claim" (
    "id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "productName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Assessment" (
    "id" UUID NOT NULL,
    "claimId" UUID NOT NULL,
    "evidence" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Assessment_claimId_createdAt_idx" ON "Assessment"("claimId", "createdAt");
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
