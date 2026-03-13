import Link from "next/link";
import PageShell from "@/app/components/PageShell";
import PurposeCard from "@/app/components/PurposeCard";
import { getStore } from "@/lib/store";
import { requireWorkspaceContext } from "@/lib/workspace/context";

const withParams = (href: string, params: Record<string, string | undefined>) => {
  const nextParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) nextParams.set(key, value);
  });
  const query = nextParams.toString();
  return query ? `${href}?${query}` : href;
};

export default async function ScheduleArchivePage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const { workspace, user, features } = await requireWorkspaceContext();
  const store = getStore(workspace.id);
  const enabled = user.isAdmin || features.SCHEDULING;
  const statusFilter = params?.status ?? "all";
  const schedules = (await store.listSchedules()).filter((schedule) => {
    if (schedule.status === "NEEDS_REVIEW") return false;
    if (statusFilter === "all") return true;
    return schedule.status === statusFilter;
  });
  const statusCounts = schedules.reduce<Record<string, number>>((acc, schedule) => {
    acc[schedule.status] = (acc[schedule.status] ?? 0) + 1;
    return acc;
  }, {});
  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${active ? "border-slate-500 bg-slate-800 text-white" : "border-slate-800 text-slate-300"}`;
  const makeFilterLink = (value: string) =>
    withParams("/schedules/archive", { status: value === "all" ? undefined : value });

  return (
    <PageShell
      title="Schedule archive"
      subtitle="Schedule proposals after review."
      workspaceName={workspace.name}
      isAdmin={user.isAdmin}
      features={features}
      actions={
        <Link
          href={withParams("/inbox", {
            status: statusFilter === "all" ? undefined : statusFilter,
          })}
          className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
        >
          Back to inbox
        </Link>
      }
    >
      <PurposeCard>
        Review completed schedule proposals and track outcomes after approval workflows.
      </PurposeCard>
      {!enabled ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          Scheduling is disabled for this workspace.
        </div>
      ) : (
        <>
          <section className="flex flex-wrap gap-2">
            {[
              { label: "All", value: "all" },
              { label: "Approved", value: "APPROVED" },
              { label: "Revision", value: "REVISION_REQUESTED" },
              { label: "Rejected", value: "REJECTED" },
            ].map((item) => (
              <Link
                key={item.value}
                href={makeFilterLink(item.value)}
                className={chipClass(statusFilter === item.value)}
              >
                {item.label}
              </Link>
            ))}
          </section>
          <section className="flex flex-wrap gap-3">
            {Object.entries(statusCounts).length === 0 ? (
              <span className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-500">
                No archived schedules yet
              </span>
            ) : (
              Object.entries(statusCounts).map(([status, count]) => (
                <span
                  key={status}
                  className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300"
                >
                  {status}: {count}
                </span>
              ))
            )}
          </section>
          <section className="grid gap-4">
            {schedules.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-500">
                No archived schedules yet.
              </div>
            ) : (
              schedules.map((schedule) => (
                <Link
                  key={schedule.id}
                  href={withParams(`/schedules/${schedule.id}`, {
                    status: statusFilter === "all" ? undefined : statusFilter,
                  })}
                  className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-200 hover:border-slate-600"
                >
                  <div className="font-semibold text-slate-100">Schedule proposal</div>
                  <div className="text-xs text-slate-500">
                    {schedule.items.length} items · {schedule.status}
                  </div>
                </Link>
              ))
            )}
          </section>
        </>
      )}
    </PageShell>
  );
}
