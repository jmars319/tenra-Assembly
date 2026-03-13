import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/lib/prisma";
import {
  fetchCommits,
  fetchDocumentation,
  fetchPullRequests,
  fetchReleases,
} from "@/lib/github/evidence";
import { requireApiContext } from "@/lib/auth/api";
import { getAuditLabel } from "@/lib/audit/labels";

type Scope = "FULL" | "DAYS" | "AUTO" | "COMMITS";

const daysToIso = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

export async function POST(request: Request) {
  if (process.env.STORAGE_MODE !== "db") {
    return NextResponse.json({ error: "Evidence requires STORAGE_MODE=db." }, { status: 400 });
  }
  const auth = await requireApiContext("GITHUB_SYNC");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const repoId = typeof body?.repoId === "string" ? body.repoId : "";
  const scope = (body?.scope ?? "AUTO") as Scope;
  const days = Number.isInteger(body?.days) ? body.days : 30;
  const commitWindowSize = Number.isInteger(body?.commitWindowSize) ? body.commitWindowSize : 50;
  const commitWindowPage = Number.isInteger(body?.commitWindowPage) ? body.commitWindowPage : 0;
  const sources = body?.sources ?? {};
  const includeContent = Boolean(body?.includeContent);

  if (!repoId) {
    return NextResponse.json({ error: "repoId is required." }, { status: 400 });
  }

  const prisma = getPrismaClient();
  if (!("evidenceBundle" in prisma) || !("evidenceItem" in prisma)) {
    return NextResponse.json(
      { error: "Evidence tables not available. Run prisma generate and migrate." },
      { status: 500 }
    );
  }
  const repo = await prisma.repoAccess.findFirst({
    where: { id: repoId, workspaceId: auth.context.workspaceId },
  });
  if (!repo) {
    return NextResponse.json({ error: "Repo not found." }, { status: 404 });
  }

  const installation = await prisma.gitHubInstallation.findFirst({
    where: { workspaceId: auth.context.workspaceId },
    orderBy: { createdAt: "desc" },
  });
  if (!installation) {
    return NextResponse.json({ error: "GitHub not connected." }, { status: 400 });
  }

  const hasFull = await prisma.evidenceBundle.findFirst({
    where: { repoId, scope: "FULL", workspaceId: auth.context.workspaceId },
  });

  const resolvedScope: "FULL" | "DAYS" | "COMMITS" =
    scope === "FULL"
      ? "FULL"
      : scope === "DAYS"
        ? "DAYS"
        : scope === "COMMITS"
          ? "COMMITS"
          : hasFull
            ? "DAYS"
            : "FULL";
  const scopeValue = resolvedScope === "DAYS" ? days : resolvedScope === "COMMITS" ? commitWindowSize : null;
  const scopePage = resolvedScope === "COMMITS" ? Math.max(commitWindowPage, 0) : null;
  const autoSelected = scope === "AUTO";
  const since = resolvedScope === "DAYS" ? daysToIso(days) : undefined;

  const shouldDocs = sources?.docs !== false;
  const shouldCommits = sources?.commits !== false;
  const shouldPulls = sources?.pulls !== false;
  const shouldReleases = sources?.releases !== false;
  if (!shouldDocs && !shouldCommits && !shouldPulls && !shouldReleases) {
    return NextResponse.json({ error: "Select at least one evidence source." }, { status: 400 });
  }

  const [commitsRaw, pulls, releases, docs] = await Promise.all([
    shouldCommits ? fetchCommits(installation.installationId, repo.repo, since, includeContent) : [],
    shouldPulls ? fetchPullRequests(installation.installationId, repo.repo, since) : [],
    shouldReleases ? fetchReleases(installation.installationId, repo.repo, since) : [],
    shouldDocs ? fetchDocumentation(installation.installationId, repo.repo) : [],
  ]);

  const commits =
    resolvedScope === "COMMITS"
      ? commitsRaw
          .slice()
          .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
          .slice(
            Math.max(scopePage ?? 0, 0) * Math.max(commitWindowSize, 1),
            Math.max(scopePage ?? 0, 0) * Math.max(commitWindowSize, 1) + Math.max(commitWindowSize, 1)
          )
      : commitsRaw;

  const bundle = await prisma.evidenceBundle.create({
    data: {
      workspaceId: auth.context.workspaceId,
      repoId,
      repoFullName: repo.repo,
      scope: resolvedScope,
      scopeValue,
      scopePage,
      autoSelected,
      items: {
        create: [...docs, ...commits, ...pulls, ...releases].map((item) => ({
          workspaceId: auth.context.workspaceId,
          type: item.type,
          title: item.title,
          body: item.body,
          url: item.url,
          occurredAt: new Date(item.occurredAt),
          content: "content" in item ? item.content : undefined,
          metadata: (item.metadata ?? {}) as Prisma.InputJsonValue,
        })),
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: "system:project_assistant",
      actorUserId: auth.context.user.id,
      action: "EVIDENCE_CAPTURED",
      actionLabel: getAuditLabel("EVIDENCE_CAPTURED"),
      entityType: "EvidenceBundle",
      entityId: bundle.id,
      workspaceId: auth.context.workspaceId,
      metadata: { repoId, scope: resolvedScope, scopeValue, scopePage },
    },
  });

  return NextResponse.json({
    bundleId: bundle.id,
    scope: resolvedScope,
    scopeValue,
    scopePage,
    totalItems: commits.length + pulls.length + releases.length + docs.length,
  });
}
