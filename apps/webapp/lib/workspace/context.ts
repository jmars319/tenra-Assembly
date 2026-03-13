import "server-only";

import { redirect } from "next/navigation";
import { getPrismaClient } from "@/lib/prisma";
import { requireSession, requireWorkspaceAccess } from "@/lib/auth/guard";
import type { FeatureKey } from "@prisma/client";

type WorkspaceContext = {
  user: { id: string; email: string; isAdmin: boolean };
  role?: "OWNER" | "MEMBER";
  workspace: { id: string; name: string; slug: string };
  features: Partial<Record<FeatureKey, boolean>>;
};

export const requireWorkspaceContext = async (): Promise<WorkspaceContext> => {
  const session = await requireSession();
  if (!session) {
    redirect("/login");
  }
  const access = await requireWorkspaceAccess(session);
  if (!access) {
    redirect("/workspaces?error=forbidden");
  }

  const prisma = getPrismaClient();
  const workspace = await prisma.workspace.findUnique({
    where: { id: access.workspaceId },
  });

  if (!workspace) {
    redirect("/workspaces?error=missing");
  }

  const flags = await prisma.workspaceFeature.findMany({
    where: { workspaceId: access.workspaceId },
  });
  const features = flags.reduce<Partial<Record<FeatureKey, boolean>>>((acc, flag) => {
    acc[flag.key] = flag.enabled;
    return acc;
  }, {});

  return {
    user: access.user,
    role: access.role,
    workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
    features,
  };
};
