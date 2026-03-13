import PageShell from "@/app/components/PageShell";
import Link from "next/link";
import { getContentStatus, listContentItems } from "@/lib/content/service";
import { contentTypes } from "@/lib/content/types";
import { getPromotionIssuesForItem } from "@/lib/content/validators";
import { requireWorkspaceContext } from "@/lib/workspace/context";

export default async function ContentDashboardPage() {
  const { workspace, user, features } = await requireWorkspaceContext();
  const isDb = process.env.STORAGE_MODE === "db";
  const enabled = user.isAdmin || features.CONTENT_OPS;

  if (!enabled) {
    return (
      <PageShell
        workspaceName={workspace.name}
        isAdmin={user.isAdmin}
        features={features}
        title="Content"
        subtitle="Content Ops is disabled for this workspace."
      >
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          Ask a workspace owner to enable Content Ops in Settings.
        </div>
      </PageShell>
    );
  }

  if (!isDb) {
    return (
      <PageShell
        workspaceName={workspace.name}
        isAdmin={user.isAdmin}
        features={features}
        title="Content"
        subtitle="Content Ops requires DB mode."
        actions={
          <Link href="/content/new" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200">
            New content
          </Link>
        }
      >
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          Set `STORAGE_MODE=db` and `DATABASE_URL` to use Content Ops.
        </div>
      </PageShell>
    );
  }

  const data = await getContentStatus(workspace.id);
  const recent = await listContentItems(workspace.id, {});
  const needsAttention = recent
    .filter((item) => !["READY", "APPROVED", "ARCHIVED"].includes(item.status))
    .map((item) => {
      const issues = getPromotionIssuesForItem({
        type: item.type,
        rawInput: item.rawInput,
        structured: item.structured ?? undefined,
        format: "md",
      });
      return issues.length
        ? {
            id: item.id,
            type: item.type,
            title: item.title || item.type.replace(/_/g, " "),
            reason: issues[0]?.message ?? "Needs review.",
          }
        : null;
    })
    .filter(Boolean) as Array<{ id: string; type: string; title: string; reason: string }>;

  return (
    <PageShell
      workspaceName={workspace.name}
      isAdmin={user.isAdmin}
      features={features}
      title="Content"
      subtitle="Typed content intake with approvals and cadence tracking."
      actions={
        <Link href="/content/new" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200">
          New content
        </Link>
      }
    >
      <section className="grid gap-4 md:grid-cols-2">
        {contentTypes.map((type) => {
          const typeCounts = data.counts[type] ?? {};
          const total = Object.values(typeCounts).reduce((sum, value) => sum + value, 0);
          return (
            <div key={type} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="text-xs uppercase tracking-wide text-slate-500">{type.replace(/_/g, " ")}</div>
              <div className="mt-2 text-2xl font-semibold text-white">{total}</div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                {Object.entries(typeCounts).map(([status, count]) => (
                  <span key={status} className="rounded-full border border-slate-800 px-2 py-1">
                    {status.toLowerCase()}: {count}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section className="flex flex-wrap gap-3">
        <Link
          href="/content/project-notes"
          className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
        >
          Project notes
        </Link>
        <Link
          href="/content/coverage"
          className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
        >
          Coverage
        </Link>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="text-sm font-semibold text-slate-200">Cadence reminders</div>
        {data.reminders.length === 0 ? (
          <div className="mt-3 text-sm text-slate-400">No cadence reminders right now.</div>
        ) : (
          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            {data.reminders.map((reminder) => (
              <div key={reminder.type} className="rounded-lg border border-slate-800 px-3 py-2">
                {reminder.type.replace(/_/g, " ")} is due (target {reminder.cadenceTarget}).
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="text-sm font-semibold text-slate-200">Needs attention</div>
        <div className="mt-1 text-xs text-slate-500">
          Items blocked from READY based on the current input.
        </div>
        {needsAttention.length === 0 ? (
          <div className="mt-3 text-sm text-slate-400">No content items blocked right now.</div>
        ) : (
          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            {needsAttention.slice(0, 6).map((item) => (
              <Link
                key={item.id}
                href={`/content/${item.id}`}
                className="rounded-lg border border-slate-800 px-3 py-2 hover:border-emerald-400/60"
              >
                <div className="text-slate-100">{item.title}</div>
                <div className="text-xs text-slate-500">{item.reason}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="text-sm font-semibold text-slate-200">Recent content</div>
        {recent.length === 0 ? (
          <div className="mt-3 text-sm text-slate-400">No content items yet.</div>
        ) : (
          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            {recent.slice(0, 10).map((item) => (
              <Link
                key={item.id}
                href={`/content/${item.id}`}
                className="rounded-lg border border-slate-800 px-3 py-2 hover:border-emerald-400/60"
              >
                <div className="text-slate-100">{item.title || item.type.replace(/_/g, " ")}</div>
                <div className="text-xs text-slate-500">{item.status}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
