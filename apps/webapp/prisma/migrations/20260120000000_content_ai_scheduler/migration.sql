-- Add aiMeta to ContentItem
ALTER TABLE "ContentItem" ADD COLUMN "aiMeta" JSONB;

-- Create ContentScheduleProposal
CREATE TABLE "ContentScheduleProposal" (
  "id" TEXT NOT NULL,
  "contentItemId" TEXT NOT NULL,
  "status" "ScheduleStatus" NOT NULL,
  "channel" TEXT NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "rationale" TEXT,
  "assumptions" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ContentScheduleProposal_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContentScheduleProposal"
  ADD CONSTRAINT "ContentScheduleProposal_contentItemId_fkey"
  FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
