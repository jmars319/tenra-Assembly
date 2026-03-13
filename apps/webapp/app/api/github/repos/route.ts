import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { hasGitHubEnv } from "@/lib/github/env";
import { requireApiContext } from "@/lib/auth/api";

export async function GET() {
  const auth = await requireApiContext("GITHUB");
  if (!auth.ok) return auth.response;

  if (process.env.STORAGE_MODE !== "db" || !hasGitHubEnv()) {
    return NextResponse.json({ repos: [], connected: false });
  }

  const prisma = getPrismaClient();
  const installation = await prisma.gitHubInstallation.findFirst({
    where: { workspaceId: auth.context.workspaceId },
    orderBy: { createdAt: "desc" },
  });

  if (!installation) {
    return NextResponse.json({ repos: [], connected: false });
  }

  const repos = await prisma.gitHubRepo.findMany({
    where: { installationId: installation.id, workspaceId: auth.context.workspaceId },
    orderBy: { repoId: "desc" },
  });

  return NextResponse.json({ connected: true, repos });
}
