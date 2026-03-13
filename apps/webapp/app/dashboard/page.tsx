import Link from "next/link";
import PageShell from "@/app/components/PageShell";
import PurposeCard from "@/app/components/PurposeCard";
import HowToUseModal from "@/app/dashboard/HowToUseModal";
import { getStore } from "@/lib/store";
import type { AuditLog } from "@/lib/store/types";
import { getAuditDisplay } from "@/lib/audit/labels";
import { getPromotionIssuesForItem } from "@/lib/content/validators";
import { getPrismaClient } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/workspace/context";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ actor?: string }>;
}) {
  const { workspace, user, features } = await requireWorkspaceContext();
  const params = await searchParams;
  const store = getStore(workspace.id);
  const data = await store.getDashboard();
  const actorFilter = params?.actor ?? "all";
  const isDb = process.env.STORAGE_MODE === "db";
  const archiveLink = (() => {
    const nextParams = new URLSearchParams();
    if (actorFilter !== "all") nextParams.set("actor", actorFilter);
    return nextParams.toString() ? `/dashboard/audit?${nextParams.toString()}` : "/dashboard/audit";
  })();
  const filteredAudit = data.recentAudit.filter((entry) => {
    if (actorFilter === "system") return entry.actor?.startsWith("system:");
    if (actorFilter === "admin") return entry.actor === "admin";
    return true;
  });
  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${active ? "border-slate-500 bg-slate-800 text-white" : "border-slate-800 text-slate-300"}`;
  const makeFilterLink = (value: string) => {
    const nextParams = new URLSearchParams();
    if (value !== "all") nextParams.set("actor", value);
    const query = nextParams.toString();
    return query ? `/dashboard?${query}` : "/dashboard";
  };

  let contentNeeds = 0;
  let contentNeedReason = "No blocking issues.";
  let contentCount = 0;
  let briefsCount = 0;
  let evidenceCount = 0;
  let githubConnected = false;

  if (isDb) {
    const prisma = getPrismaClient();
    const [contentItems, briefTotal, evidenceTotal, githubInstall] = await Promise.all([
      prisma.contentItem.findMany({
        where: { status: { notIn: ["READY", "APPROVED", "ARCHIVED"] }, workspaceId: workspace.id },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prisma.brief.count({ where: { workspaceId: workspace.id } }),
      prisma.evidenceBundle.count({ where: { workspaceId: workspace.id } }),
      prisma.gitHubInstallation.findFirst({ where: { workspaceId: workspace.id } }),
    ]);
    contentCount = await prisma.contentItem.count({ where: { workspaceId: workspace.id } });
    briefsCount = briefTotal;
    evidenceCount = evidenceTotal;
    githubConnected = Boolean(githubInstall);
    const issues = contentItems.flatMap((item) =>
      getPromotionIssuesForItem({
        type: item.type,
        rawInput: item.rawInput,
        structured: item.structured ?? undefined,
        format: "md",
      }),
    );
    contentNeeds = contentItems.filter((item) => {
      const itemIssues = getPromotionIssuesForItem({
        type: item.type,
        rawInput: item.rawInput,
        structured: item.structured ?? undefined,
        format: "md",
      });
      return itemIssues.length > 0;
    }).length;
    contentNeedReason = issues[0]?.message ?? "No blocking issues.";
  }

  const needsAttention = [
    { label: "Posts", count: data.counts.postsReady, reason: "Awaiting review." },
    { label: "Schedules", count: data.counts.schedulesReady, reason: "Awaiting approval." },
    { label: "Tasks", count: data.counts.tasksDue, reason: "Pending tasks." },
    { label: "Content", count: contentNeeds, reason: contentNeedReason },
  ];

  return (
    <PageShell
      workspaceName={workspace.name}
      isAdmin={user.isAdmin}
      features={features}
      title="Dashboard"
      subtitle="Pipeline snapshot with recent audit activity."
      actions={
        <div className="flex flex-wrap gap-2">
          <HowToUseModal />
          <Link
            href={archiveLink}
            className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
          >
            View audit archive
          </Link>
        </div>
      }
    >
      <PurposeCard>
        A high-level snapshot of review readiness and recent actions across posts, schedules, and tasks.
      </PurposeCard>
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Posts ready", value: data.counts.postsReady },
          { label: "Schedules ready", value: data.counts.schedulesReady },
          { label: "Tasks due", value: data.counts.tasksDue },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
          >
            <div className="text-xs uppercase tracking-widest text-slate-500">{item.label}</div>
            <div className="mt-3 text-3xl font-semibold text-white">{item.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="text-sm font-semibold text-slate-200">System overview</div>
        <div className="mt-1 text-xs text-slate-500">Current module coverage and readiness.</div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            { label: "Content", value: isDb ? contentCount : "DB only" },
            { label: "Briefs", value: isDb ? briefsCount : "DB only" },
            { label: "Drafts", value: data.counts.postsReady },
            { label: "Schedules", value: data.counts.schedulesReady },
            { label: "GitHub", value: githubConnected ? "Connected" : "Not connected" },
            { label: "Evidence", value: isDb ? evidenceCount : "DB only" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">{item.label}</div>
              <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      <details className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <summary className="cursor-pointer text-sm font-semibold text-slate-200">
          Needs attention
        </summary>
        <div className="mt-3 grid gap-2 text-sm text-slate-300">
          {needsAttention.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-800 px-3 py-2">
              <div className="text-slate-100">
                {item.label}: {item.count}
              </div>
              <div className="text-xs text-slate-500">{item.reason}</div>
            </div>
          ))}
        </div>
      </details>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="text-sm font-semibold text-slate-200">Latest audit logs</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { label: "All", value: "all" },
            { label: "System", value: "system" },
            { label: "Admin", value: "admin" },
          ].map((item) => (
            <Link key={item.value} href={makeFilterLink(item.value)} className={chipClass(actorFilter === item.value)}>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="mt-4 grid gap-3">
          {filteredAudit.length === 0 ? (
            <div className="text-sm text-slate-500">No audit activity yet.</div>
          ) : (
            filteredAudit.map((entry: AuditLog) => {
              const display = getAuditDisplay(entry.action);
              return (
              <div
                key={entry.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-100">{display.label}</div>
                    <div className="text-xs text-slate-500">
                      {entry.actor ?? "system"} · {new Date(entry.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">{display.detail}</div>
                </div>
                {entry.metadata ? (
                  <details className="mt-2 text-xs text-slate-400">
                    <summary className="cursor-pointer text-slate-500">Raw details</summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            );
            })
          )}
        </div>
      </section>
    </PageShell>
  );
}
