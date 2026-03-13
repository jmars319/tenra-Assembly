import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSession, setActiveWorkspaceCookie, setSessionCookie } from "@/lib/auth/session";

const readPayload = async (request: Request) => {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return {
      token: typeof body?.token === "string" ? body.token : "",
      password: typeof body?.password === "string" ? body.password : "",
    };
  }
  const formData = await request.formData().catch(() => null);
  const token = formData?.get("token");
  const password = formData?.get("password");
  return {
    token: typeof token === "string" ? token : "",
    password: typeof password === "string" ? password : "",
  };
};

export async function POST(request: Request) {
  const { token, password } = await readPayload(request);
  const isForm = (request.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded");
  if (!token || !password) {
    if (isForm) {
      return NextResponse.redirect(new URL(`/accept-invite?error=1`, request.url));
    }
    return NextResponse.json({ error: "Invite token and password are required." }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: true },
  });

  if (
    !invite ||
    invite.status !== "PENDING" ||
    invite.usedAt ||
    invite.expiresAt.getTime() < Date.now()
  ) {
    if (invite && invite.status === "PENDING" && invite.expiresAt.getTime() < Date.now()) {
      await prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED", usedAt: new Date() },
      });
    }
    if (isForm) {
      return NextResponse.redirect(new URL(`/accept-invite/${token}?error=1`, request.url));
    }
    return NextResponse.json({ error: "Invite is invalid or expired." }, { status: 400 });
  }

  const email = invite.email.toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const passwordHash = await hashPassword(password);
    user = await prisma.user.create({
      data: { email, passwordHash },
    });
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: user.id } },
  });
  if (!membership) {
    await prisma.workspaceMember.create({
      data: {
        workspaceId: invite.workspaceId,
        userId: user.id,
        role: invite.role,
        active: true,
      },
    });
  } else if (!membership.active) {
    await prisma.workspaceMember.update({
      where: { id: membership.id },
      data: { active: true, role: invite.role },
    });
  }

  await prisma.workspaceInvite.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED", usedAt: new Date() },
  });

  const { token: sessionToken } = await createSession(user.id);
  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  setSessionCookie(response, sessionToken);
  setActiveWorkspaceCookie(response, invite.workspaceId);
  return response;
}
