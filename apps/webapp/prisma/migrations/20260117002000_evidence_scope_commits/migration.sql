-- Add commit chunk scope support for evidence bundles
ALTER TYPE "EvidenceScope" ADD VALUE IF NOT EXISTS 'COMMITS';
ALTER TABLE "EvidenceBundle" ADD COLUMN IF NOT EXISTS "scopePage" INTEGER;
