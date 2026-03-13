import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { hasGitHubEnv } from "@/lib/github/env";
import { requireApiContext } from "@/lib/auth/api";

export async function POST() {
  const auth = await requireApiContext("GITHUB_CONNECT");
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
    return NextResponse.json({ ok: true });
  }

  await prisma.$transaction([
    prisma.gitHubRepo.deleteMany({
      where: { installationId: installation.id, workspaceId: auth.context.workspaceId },
    }),
    prisma.gitHubInstallation.delete({ where: { id: installation.id } }),
    prisma.repoAccess.deleteMany({
      where: { workspaceId: auth.context.workspaceId, id: { startsWith: "github-" } },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
