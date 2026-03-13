import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getPrismaClient } from "@/lib/prisma";
import { requireSession, requireWorkspaceAccess } from "@/lib/auth/guard";

const EXPIRY_HOURS = 72;

const readPayload = async (request: Request) => {
  const body = await request.json().catch(() => ({}));
  return {
    email: typeof body?.email === "string" ? body.email : "",
    role: body?.role === "OWNER" ? "OWNER" : "MEMBER",
  } as { email: string; role: "OWNER" | "MEMBER" };
};

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const access = await requireWorkspaceAccess(session);
  if (!access) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const prisma = getPrismaClient();
  if (!session.user.isAdmin) {
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: access.workspaceId,
        userId: session.user.id,
        role: "OWNER",
        active: true,
      },
    });
    if (!member) {
      return NextResponse.json({ error: "Owner role required." }, { status: 403 });
    }
  }

  const { email, role } = await readPayload(request);
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);
  const token = crypto.randomBytes(24).toString("hex");

  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId: access.workspaceId,
      email: normalizedEmail,
      role,
      token,
      expiresAt,
    },
  });

  return NextResponse.json({
    ok: true,
    inviteUrl: `${new URL(request.url).origin}/accept-invite/${invite.token}`,
  });
}
