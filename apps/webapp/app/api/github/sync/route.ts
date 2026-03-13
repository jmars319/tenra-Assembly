import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { hasGitHubEnv } from "@/lib/github/env";
import { syncInstallationRepos } from "@/lib/github/sync";
import { requireApiContext } from "@/lib/auth/api";

export async function POST() {
  const auth = await requireApiContext("GITHUB_SYNC");
  if (!auth.ok) return auth.response;

  if (process.env.STORAGE_MODE !== "db" || !hasGitHubEnv()) {
    return NextResponse.json({ error: "GitHub not configured." }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const installation = await prisma.gitHubInstallation.findFirst({
    where: { workspaceId: auth.context.workspaceId },
    orderBy: { createdAt: "desc" },
  });

  if (!installation) {
    return NextResponse.json({ error: "No installation." }, { status: 404 });
  }

  const count = await syncInstallationRepos(
    prisma,
    auth.context.workspaceId,
    installation.id,
    installation.installationId
  );

  return NextResponse.json({ synced: count });
}
