-- Phase 1: multi-tenant auth + workspaces
BEGIN;

-- Enums
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'MEMBER');
CREATE TYPE "FeatureKey" AS ENUM (
  'GITHUB',
  'GITHUB_CONNECT',
  'GITHUB_SYNC',
  'CONTENT_OPS',
  'CONTENT_UPLOAD',
  'SCHEDULING',
  'AI_ASSIST',
  'AI_BRIEFS',
  'AI_CONTENT_ASSIST',
  'AI_SCHEDULER'
);
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- Core tables
CREATE TABLE "Workspace" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "isAdmin" BOOLEAN NOT NULL DEFAULT false,
  "failedLoginCount" INTEGER DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "WorkspaceMember" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "WorkspaceRole" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId","userId");
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PasswordReset" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorkspaceInvite" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
  "token" TEXT NOT NULL,
  "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkspaceInvite_token_key" ON "WorkspaceInvite"("token");
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorkspaceFeature" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "key" "FeatureKey" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceFeature_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkspaceFeature_workspaceId_key_key" ON "WorkspaceFeature"("workspaceId","key");
ALTER TABLE "WorkspaceFeature" ADD CONSTRAINT "WorkspaceFeature_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorkspaceInstruction" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "tone" TEXT,
  "voice" TEXT,
  "hardRules" TEXT,
  "doList" TEXT,
  "dontList" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceInstruction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkspaceInstruction_workspaceId_key" ON "WorkspaceInstruction"("workspaceId");
ALTER TABLE "WorkspaceInstruction" ADD CONSTRAINT "WorkspaceInstruction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserInstruction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tone" TEXT,
  "notes" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserInstruction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserInstruction_userId_key" ON "UserInstruction"("userId");
ALTER TABLE "UserInstruction" ADD CONSTRAINT "UserInstruction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorkspaceApiKey" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'openai',
  "apiKeyCipher" TEXT,
  "apiKeyLast4" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceApiKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkspaceApiKey_workspaceId_key" ON "WorkspaceApiKey"("workspaceId");
ALTER TABLE "WorkspaceApiKey" ADD CONSTRAINT "WorkspaceApiKey_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorkspaceUsageCaps" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "dailyLimit" INTEGER,
  "monthlyLimit" INTEGER,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceUsageCaps_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkspaceUsageCaps_workspaceId_key" ON "WorkspaceUsageCaps"("workspaceId");
ALTER TABLE "WorkspaceUsageCaps" ADD CONSTRAINT "WorkspaceUsageCaps_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorkspaceUsageLog" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT,
  "model" TEXT,
  "tokens" INTEGER,
  "requestCount" INTEGER DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceUsageLog_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "WorkspaceUsageLog" ADD CONSTRAINT "WorkspaceUsageLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceUsageLog" ADD CONSTRAINT "WorkspaceUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "WorkspaceStyle" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "instructions" JSONB NOT NULL,
  "isPreset" BOOLEAN NOT NULL DEFAULT false,
  "createdByUserId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceStyle_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkspaceStyle_workspaceId_name_key" ON "WorkspaceStyle"("workspaceId","name");
ALTER TABLE "WorkspaceStyle" ADD CONSTRAINT "WorkspaceStyle_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceStyle" ADD CONSTRAINT "WorkspaceStyle_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UserStylePreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "defaultStyleId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserStylePreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserStylePreference_userId_workspaceId_key" ON "UserStylePreference"("userId","workspaceId");
ALTER TABLE "UserStylePreference" ADD CONSTRAINT "UserStylePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserStylePreference" ADD CONSTRAINT "UserStylePreference_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Default workspace
INSERT INTO "Workspace" ("id","name","slug","createdAt","updatedAt")
VALUES ('workspace_default','Ledger Workspace','default',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Existing tables: add workspaceId and audit fields
ALTER TABLE "Project" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'workspace_default';
ALTER TABLE "RepoAccess" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'workspace_default';
ALTER TABLE "Brief" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'workspace_default';
ALTER TABLE "Post" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'workspace_default';
ALTER TABLE "ScheduleProposal" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'workspace_default';
ALTER TABLE "Task" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'workspace_default';
ALTER TABLE "ContentItem" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'workspace_default';
ALTER TABLE "ContentScheduleProposal" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'workspace_default';
ALTER TABLE "AuditLog" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'workspace_default';
ALTER TABLE "AuditLog" ADD COLUMN "actorUserId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "actionLabel" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "beforeJson" JSONB;
ALTER TABLE "AuditLog" ADD COLUMN "afterJson" JSONB;
ALTER TABLE "EvidenceBundle" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'workspace_default';
ALTER TABLE "EvidenceItem" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'workspace_default';
ALTER TABLE "GitHubInstallation" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'workspace_default';
ALTER TABLE "GitHubRepo" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'workspace_default';

-- Foreign keys to Workspace
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepoAccess" ADD CONSTRAINT "RepoAccess_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Brief" ADD CONSTRAINT "Brief_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleProposal" ADD CONSTRAINT "ScheduleProposal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentScheduleProposal" ADD CONSTRAINT "ContentScheduleProposal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EvidenceBundle" ADD CONSTRAINT "EvidenceBundle_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GitHubInstallation" ADD CONSTRAINT "GitHubInstallation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GitHubRepo" ADD CONSTRAINT "GitHubRepo_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Adjust unique constraints for multi-tenant
DROP INDEX IF EXISTS "Project_tag_key";
CREATE UNIQUE INDEX "Project_workspaceId_tag_key" ON "Project"("workspaceId","tag");

CREATE UNIQUE INDEX "RepoAccess_workspaceId_repo_key" ON "RepoAccess"("workspaceId","repo");

DROP INDEX IF EXISTS "GitHubInstallation_installationId_key";
CREATE UNIQUE INDEX "GitHubInstallation_workspaceId_installationId_key" ON "GitHubInstallation"("workspaceId","installationId");

DROP INDEX IF EXISTS "GitHubRepo_repoId_key";
CREATE UNIQUE INDEX "GitHubRepo_workspaceId_repoId_key" ON "GitHubRepo"("workspaceId","repoId");

-- Default feature flags for the default workspace
INSERT INTO "WorkspaceFeature" ("id","workspaceId","key","enabled","updatedAt") VALUES
  ('workspace_default_github','workspace_default','GITHUB',false,CURRENT_TIMESTAMP),
  ('workspace_default_github_connect','workspace_default','GITHUB_CONNECT',false,CURRENT_TIMESTAMP),
  ('workspace_default_github_sync','workspace_default','GITHUB_SYNC',false,CURRENT_TIMESTAMP),
  ('workspace_default_content_ops','workspace_default','CONTENT_OPS',true,CURRENT_TIMESTAMP),
  ('workspace_default_content_upload','workspace_default','CONTENT_UPLOAD',true,CURRENT_TIMESTAMP),
  ('workspace_default_scheduling','workspace_default','SCHEDULING',true,CURRENT_TIMESTAMP),
  ('workspace_default_ai_assist','workspace_default','AI_ASSIST',true,CURRENT_TIMESTAMP),
  ('workspace_default_ai_briefs','workspace_default','AI_BRIEFS',true,CURRENT_TIMESTAMP),
  ('workspace_default_ai_content_assist','workspace_default','AI_CONTENT_ASSIST',true,CURRENT_TIMESTAMP),
  ('workspace_default_ai_scheduler','workspace_default','AI_SCHEDULER',true,CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

COMMIT;
