import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import {
  clearSessionCookie,
  createSession,
  setActiveWorkspaceCookie,
  setSessionCookie,
} from "@/lib/auth/session";
import { DEFAULT_WORKSPACE_ID } from "@/lib/workspace/constants";

const readCredentials = async (request: Request) => {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return {
      email: typeof body?.email === "string" ? body.email : "",
      password: typeof body?.password === "string" ? body.password : "",
    };
  }

  const formData = await request.formData().catch(() => null);
  const email = formData?.get("email");
  const password = formData?.get("password");
  return {
    email: typeof email === "string" ? email : "",
    password: typeof password === "string" ? password : "",
  };
};

const applyLockout = async (userId: string, failedLoginCount: number) => {
  const prisma = getPrismaClient();
  const lockCount = failedLoginCount + 1;
  const updates: { failedLoginCount: number; lockedUntil?: Date } = { failedLoginCount: lockCount };
  if (lockCount >= 5) {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + 15);
    updates.lockedUntil = lockedUntil;
  }
  await prisma.user.update({ where: { id: userId }, data: updates });
};

export async function POST(request: Request) {
  const isForm =
    (request.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded");
  const { email, password } = await readCredentials(request);
  if (!email || !password) {
    if (isForm) {
      return NextResponse.redirect(new URL("/login?error=1", request.url));
    }
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    if (isForm) {
      return NextResponse.redirect(new URL("/login?error=1", request.url));
    }
    const response = NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    clearSessionCookie(response);
    return response;
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    if (isForm) {
      return NextResponse.redirect(new URL("/login?error=1", request.url));
    }
    return NextResponse.json({ error: "Account temporarily locked. Try again later." }, { status: 429 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await applyLockout(user.id, user.failedLoginCount ?? 0);
    if (isForm) {
      return NextResponse.redirect(new URL("/login?error=1", request.url));
    }
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  const { token } = await createSession(user.id);
  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  setSessionCookie(response, token);

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, active: true },
    orderBy: { createdAt: "asc" },
  });
  const workspaceId = membership?.workspaceId ?? DEFAULT_WORKSPACE_ID;
  setActiveWorkspaceCookie(response, workspaceId);

  return response;
}
