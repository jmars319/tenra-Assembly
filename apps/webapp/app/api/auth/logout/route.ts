import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import {
  clearSessionCookie,
  clearWorkspaceCookie,
  getSessionToken,
} from "@/lib/auth/session";

const clearSession = async () => {
  const token = await getSessionToken();
  if (!token) return;
  const prisma = getPrismaClient();
  await prisma.session.delete({ where: { token } }).catch(() => null);
};

export async function POST(request: Request) {
  await clearSession();
  const response = NextResponse.redirect(new URL("/login", request.url));
  clearSessionCookie(response);
  clearWorkspaceCookie(response);
  return response;
}

export async function GET(request: Request) {
  await clearSession();
  const response = NextResponse.redirect(new URL("/login", request.url));
  clearSessionCookie(response);
  clearWorkspaceCookie(response);
  return response;
}
