-- Rename Draft to Post and align fields
ALTER TYPE "DraftStatus" RENAME TO "PostStatus";

ALTER TABLE "Draft" RENAME TO "Post";
ALTER TABLE "Post" RENAME COLUMN "draftJson" TO "postJson";

ALTER TABLE "RepoAccess" RENAME COLUMN "triggerDrafts" TO "triggerPosts";
ALTER TABLE "ScheduleItem" RENAME COLUMN "draftId" TO "postId";

ALTER TABLE "Post" RENAME CONSTRAINT "Draft_pkey" TO "Post_pkey";
ALTER TABLE "Post" RENAME CONSTRAINT "Draft_projectId_fkey" TO "Post_projectId_fkey";
ALTER TABLE "ScheduleItem" RENAME CONSTRAINT "ScheduleItem_draftId_fkey" TO "ScheduleItem_postId_fkey";
