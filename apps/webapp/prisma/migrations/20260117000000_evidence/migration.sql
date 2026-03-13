-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('COMMIT', 'PULL_REQUEST', 'RELEASE');

-- CreateEnum
CREATE TYPE "EvidenceScope" AS ENUM ('FULL', 'DAYS');

-- AlterTable
ALTER TABLE "Brief" ADD COLUMN "evidenceBundleId" TEXT;

-- CreateTable
CREATE TABLE "EvidenceBundle" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "repoFullName" TEXT NOT NULL,
    "scope" "EvidenceScope" NOT NULL,
    "scopeValue" INTEGER,
    "autoSelected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceItem" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "url" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "content" TEXT,
    "metadata" JSONB,

    CONSTRAINT "EvidenceItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "EvidenceBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brief" ADD CONSTRAINT "Brief_evidenceBundleId_fkey" FOREIGN KEY ("evidenceBundleId") REFERENCES "EvidenceBundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
