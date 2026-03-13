import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { requireApiContext } from "@/lib/auth/api";
import { getAuditLabel } from "@/lib/audit/labels";

export async function POST(request: Request) {
  if (process.env.STORAGE_MODE !== "db") {
    return NextResponse.json({ error: "Schedules require STORAGE_MODE=db." }, { status: 400 });
  }
  const auth = await requireApiContext("SCHEDULING");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  if (!body?.postId || typeof body.postId !== "string") {
    return NextResponse.json({ error: "postId is required." }, { status: 400 });
  }
  if (!body?.scheduledFor || typeof body.scheduledFor !== "string") {
    return NextResponse.json({ error: "scheduledFor is required." }, { status: 400 });
  }
  if (!body?.channel || typeof body.channel !== "string") {
    return NextResponse.json({ error: "channel is required." }, { status: 400 });
  }

  const scheduledFor = new Date(body.scheduledFor);
  if (Number.isNaN(scheduledFor.getTime())) {
    return NextResponse.json({ error: "scheduledFor must be a valid date." }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const post = await prisma.post.findFirst({
    where: { id: body.postId, workspaceId: auth.context.workspaceId },
  });
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const schedule = await prisma.scheduleProposal.create({
    data: {
      workspaceId: auth.context.workspaceId,
      projectId: post.projectId,
      status: "NEEDS_REVIEW",
      items: {
        create: {
          postId: post.id,
          channel: body.channel.trim(),
          scheduledFor,
        },
      },
    },
    include: { items: true },
  });

  await prisma.auditLog.create({
    data: {
      actor: "admin",
      action: "SCHEDULE_CREATED",
      actionLabel: getAuditLabel("SCHEDULE_CREATED"),
      entityType: "ScheduleProposal",
      entityId: schedule.id,
      workspaceId: auth.context.workspaceId,
      metadata: { postId: post.id },
    },
  });

  return NextResponse.json({
    id: schedule.id,
    projectId: schedule.projectId,
    status: schedule.status,
    items: schedule.items.map((item) => ({
      id: item.id,
      postId: item.postId,
      channel: item.channel,
      scheduledFor: item.scheduledFor.toISOString(),
    })),
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
  });
}
