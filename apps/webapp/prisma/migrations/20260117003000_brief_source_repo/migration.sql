-- Add optional source repo reference for repo-specific briefs
ALTER TABLE "Brief" ADD COLUMN IF NOT EXISTS "sourceRepoId" TEXT;
ALTER TABLE "Brief"
  ADD CONSTRAINT "Brief_sourceRepoId_fkey"
  FOREIGN KEY ("sourceRepoId") REFERENCES "RepoAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;
