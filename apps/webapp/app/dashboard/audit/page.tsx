import Link from "next/link";
import PageShell from "@/app/components/PageShell";
import { getStore } from "@/lib/store";
import { getAuditDisplay } from "@/lib/audit/labels";
import { requireWorkspaceContext } from "@/lib/workspace/context";

const withParams = (href: string, params: Record<string, string | undefined>) => {
  const nextParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) nextParams.set(key, value);
  });
  const query = nextParams.toString();
  return query ? `${href}?${query}` : href;
};

export default async function AuditArchivePage({
  searchParams,
}: {
  searchParams?: Promise<{ actor?: string }>;
}) {
  const { workspace, user, features } = await requireWorkspaceContext();
  const params = await searchParams;
  const store = getStore(workspace.id);
  const actorFilter = params?.actor ?? "all";
  const logs = (await store.listAuditLogs(200)).filter((entry) => {
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
    return query ? `/dashboard/audit?${query}` : "/dashboard/audit";
  };

  return (
    <PageShell
      workspaceName={workspace.name}
      isAdmin={user.isAdmin}
      features={features}
      title="Audit archive"
      subtitle="Full audit trail for recent actions."
      actions={
        <Link
          href={withParams("/dashboard", {
            actor: actorFilter === "all" ? undefined : actorFilter,
          })}
          className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
        >
          Back to dashboard
        </Link>
      }
    >
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="text-sm font-semibold text-slate-200">Audit log</div>
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
          {logs.length === 0 ? (
            <div className="text-sm text-slate-500">No audit activity yet.</div>
          ) : (
            logs.map((entry) => {
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
