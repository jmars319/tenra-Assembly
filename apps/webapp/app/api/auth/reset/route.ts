import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { clearSessionCookie } from "@/lib/auth/session";
import { revokeSessionsForUser } from "@/lib/auth/session";

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
      return NextResponse.redirect(new URL(`/reset/${token}?error=1`, request.url));
    }
    return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const reset = await prisma.passwordReset.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!reset || reset.usedAt || reset.expiresAt.getTime() < Date.now()) {
    if (reset && !reset.usedAt && reset.expiresAt.getTime() < Date.now()) {
      await prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
    }
    if (isForm) {
      return NextResponse.redirect(new URL(`/reset/${token}?error=1`, request.url));
    }
    return NextResponse.json({ error: "Reset token is invalid or expired." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: reset.userId },
    data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
  });
  await prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
  await revokeSessionsForUser(reset.userId);

  const response = NextResponse.redirect(new URL("/login?message=Password%20updated", request.url));
  clearSessionCookie(response);
  return response;
}
