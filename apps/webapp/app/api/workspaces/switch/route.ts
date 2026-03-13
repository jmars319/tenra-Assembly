import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { requireSession, requireWorkspaceAccess } from "@/lib/auth/guard";
import { setActiveWorkspaceCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : "";
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const access = session.user.isAdmin
    ? session
    : await requireWorkspaceAccess({ ...session, workspaceId });

  if (!access) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const prisma = getPrismaClient();
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  setActiveWorkspaceCookie(response, workspaceId);
  return response;
}
