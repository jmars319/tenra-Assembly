import "server-only";
import { cookies } from "next/headers";
import { getPrismaClient } from "@/lib/prisma";
import { DEFAULT_WORKSPACE_ID } from "@/lib/workspace/constants";
import { LEGACY_WORKSPACE_COOKIE, WORKSPACE_COOKIE, getSessionToken } from "@/lib/auth/session";
import type { WorkspaceRole, FeatureKey } from "@prisma/client";

export type AuthContext = {
  user: { id: string; email: string; isAdmin: boolean };
  workspaceId: string;
  role?: WorkspaceRole;
};

const getActiveWorkspaceId = async () => {
  const store = await cookies();
  return store.get(WORKSPACE_COOKIE)?.value || store.get(LEGACY_WORKSPACE_COOKIE)?.value || DEFAULT_WORKSPACE_ID;
};

export const requireSession = async (): Promise<AuthContext | null> => {
  const token = await getSessionToken();
  if (!token) return null;
  const prisma = getPrismaClient();
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { token } }).catch(() => null);
    return null;
  }
  return {
    user: { id: session.user.id, email: session.user.email, isAdmin: session.user.isAdmin },
    workspaceId: await getActiveWorkspaceId(),
  };
};

export const requireWorkspaceAccess = async (context: AuthContext | null) => {
  if (!context) return null;
  if (context.user.isAdmin) return context;
  const prisma = getPrismaClient();
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: context.user.id, workspaceId: context.workspaceId, active: true },
  });
  if (!membership) return null;
  return { ...context, role: membership.role };
};

export const requireFeature = async (workspaceId: string, feature: string) => {
  const prisma = getPrismaClient();
  const flag = await prisma.workspaceFeature.findUnique({
    where: { workspaceId_key: { workspaceId, key: feature as FeatureKey } },
  });
  return Boolean(flag?.enabled);
};

export const isOwnerOrAdmin = (context: AuthContext | null) => {
  if (!context) return false;
  if (context.user.isAdmin) return true;
  return context.role === "OWNER";
};
