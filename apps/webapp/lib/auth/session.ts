import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";

export const SESSION_COOKIE = "assembly_session";
export const LEGACY_SESSION_COOKIE = "ledger_session";
export const WORKSPACE_COOKIE = "assembly_workspace";
export const LEGACY_WORKSPACE_COOKIE = "ledger_workspace";
const SESSION_DAYS = 7;

export const createSessionToken = () => crypto.randomBytes(32).toString("hex");

export const getSessionToken = async () => {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? store.get(LEGACY_SESSION_COOKIE)?.value ?? "";
};

export const setSessionCookie = (response: NextResponse, token: string) => {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
};

export const clearSessionCookie = (response: NextResponse) => {
  for (const name of [SESSION_COOKIE, LEGACY_SESSION_COOKIE]) {
    response.cookies.set({
      name,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }
};

export const setActiveWorkspaceCookie = (response: NextResponse, workspaceId: string) => {
  response.cookies.set({
    name: WORKSPACE_COOKIE,
    value: workspaceId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
};

export const clearWorkspaceCookie = (response: NextResponse) => {
  for (const name of [WORKSPACE_COOKIE, LEGACY_WORKSPACE_COOKIE]) {
    response.cookies.set({
      name,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }
};

export const createSession = async (userId: string) => {
  const token = createSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  const prisma = getPrismaClient();
  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });
  return { token, expiresAt };
};

export const revokeSessionsForUser = async (userId: string) => {
  const prisma = getPrismaClient();
  await prisma.session.deleteMany({ where: { userId } });
};
