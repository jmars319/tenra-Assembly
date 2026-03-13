import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { requireApiContext } from "@/lib/auth/api";
import { getAuditLabel } from "@/lib/audit/labels";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (process.env.STORAGE_MODE !== "db") {
    return NextResponse.json({ error: "Briefs require STORAGE_MODE=db." }, { status: 400 });
  }
  const auth = await requireApiContext("AI_BRIEFS");
  if (!auth.ok) return auth.response;

  if (!id) {
    return NextResponse.json({ error: "Brief id is required." }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const existing = await prisma.brief.findFirst({
    where: { id, workspaceId: auth.context.workspaceId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Brief not found." }, { status: 404 });
  }

  await prisma.brief.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      actor: "admin",
      action: "BRIEF_DELETED",
      actionLabel: getAuditLabel("BRIEF_DELETED"),
      entityType: "Brief",
      entityId: id,
      workspaceId: auth.context.workspaceId,
    },
  });

  return NextResponse.json({ ok: true });
}
