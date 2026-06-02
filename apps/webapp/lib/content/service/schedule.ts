import type { ScheduleStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";

import { createAudit, requireDb } from "./shared";

export const createContentScheduleProposal = async (input: {
  workspaceId: string;
  contentItemId: string;
  channel: string;
  scheduledFor: Date;
  rationale?: string;
  assumptions?: string;
}) => {
  requireDb();
  const prisma = getPrismaClient();
  const item = await prisma.contentItem.findFirst({
    where: { id: input.contentItemId, workspaceId: input.workspaceId },
  });
  if (!item) {
    return { ok: false, error: "Content item not found." };
  }
  if (item.status !== "APPROVED") {
    return { ok: false, error: "Content item must be APPROVED before scheduling." };
  }

  const proposal = await prisma.contentScheduleProposal.create({
    data: {
      workspaceId: input.workspaceId,
      contentItemId: input.contentItemId,
      status: "NEEDS_REVIEW",
      channel: input.channel,
      scheduledFor: input.scheduledFor,
      rationale: input.rationale,
      assumptions: input.assumptions,
    },
  });

  await createAudit(prisma, input.workspaceId, "content_schedule_proposed", proposal.id, undefined, {
    contentItemId: input.contentItemId,
    channel: input.channel,
  });

  return { ok: true, proposal };
};

export const updateContentScheduleStatus = async (
  workspaceId: string,
  id: string,
  status: ScheduleStatus,
) => {
  requireDb();
  const prisma = getPrismaClient();
  const proposal = await prisma.contentScheduleProposal.findFirst({
    where: { id, workspaceId },
  });
  if (!proposal) {
    return { ok: false, error: "Schedule proposal not found." };
  }

  const updated = await prisma.contentScheduleProposal.update({
    where: { id },
    data: { status },
  });

  await createAudit(prisma, workspaceId, "content_schedule_status", proposal.id, undefined, { status });
  return { ok: true, proposal: updated };
};
