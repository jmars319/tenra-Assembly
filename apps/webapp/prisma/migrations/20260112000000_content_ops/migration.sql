-- Content Ops core models
CREATE TYPE "ContentType" AS ENUM (
  'FIELD_NOTE',
  'PROJECT_NOTE',
  'SYSTEMS_MEMO',
  'BLOG_FEATURE',
  'CHANGE_LOG',
  'DECISION_RECORD',
  'SIGNAL_LOG'
);

CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'READY', 'APPROVED', 'REJECTED', 'ARCHIVED');

CREATE TYPE "ContentSource" AS ENUM ('MANUAL', 'UPLOAD', 'GITHUB');

CREATE TYPE "CadenceTarget" AS ENUM ('MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SIX_WEEKS', 'AD_HOC');

CREATE TABLE "ContentItem" (
  "id" TEXT NOT NULL,
  "type" "ContentType" NOT NULL,
  "status" "ContentStatus" NOT NULL,
  "title" TEXT,
  "summary" TEXT,
  "body" TEXT,
  "rawInput" TEXT,
  "structured" JSONB,
  "source" "ContentSource" NOT NULL DEFAULT 'MANUAL',
  "cadenceTarget" "CadenceTarget",
  "relatedSlugs" TEXT[] NOT NULL DEFAULT '{}',
  "topics" TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentAttachment" (
  "id" TEXT NOT NULL,
  "contentItemId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "textContent" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContentAttachment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContentAttachment"
ADD CONSTRAINT "ContentAttachment_contentItemId_fkey"
FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
