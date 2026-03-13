import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { requireApiContext } from "@/lib/auth/api";
import { getAuditLabel } from "@/lib/audit/labels";

export async function GET() {
  if (process.env.STORAGE_MODE !== "db") {
    return NextResponse.json({ error: "Briefs require STORAGE_MODE=db." }, { status: 400 });
  }
  const auth = await requireApiContext("AI_BRIEFS");
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const briefs = await prisma.brief.findMany({
    where: { workspaceId: auth.context.workspaceId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(briefs);
}

export async function POST(request: Request) {
  if (process.env.STORAGE_MODE !== "db") {
    return NextResponse.json({ error: "Briefs require STORAGE_MODE=db." }, { status: 400 });
  }
  const auth = await requireApiContext("AI_BRIEFS");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  if (!body?.projectId || typeof body.projectId !== "string") {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }
  if (!body?.summary || typeof body.summary !== "string") {
    return NextResponse.json({ error: "summary is required." }, { status: 400 });
  }
  const evidenceBundleId =
    typeof body?.evidenceBundleId === "string" ? body.evidenceBundleId : undefined;
  const sourceRepoId =
    typeof body?.sourceRepoId === "string" ? body.sourceRepoId : undefined;

  const prisma = getPrismaClient();
  const project = await prisma.project.findFirst({
    where: { id: body.projectId, workspaceId: auth.context.workspaceId },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (sourceRepoId) {
    const repo = await prisma.repoAccess.findFirst({
      where: { id: sourceRepoId, workspaceId: auth.context.workspaceId },
    });
    if (!repo) {
      return NextResponse.json({ error: "Repo not found." }, { status: 404 });
    }
  }

  const brief = await prisma.brief.create({
    data: {
      workspaceId: auth.context.workspaceId,
      projectId: body.projectId,
      summary: body.summary.trim(),
      evidenceBundleId,
      sourceRepoId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: "admin",
      action: "BRIEF_CREATED",
      actionLabel: getAuditLabel("BRIEF_CREATED"),
      entityType: "Brief",
      entityId: brief.id,
      workspaceId: auth.context.workspaceId,
      metadata: { projectId: body.projectId },
    },
  });

  return NextResponse.json(brief);
}
