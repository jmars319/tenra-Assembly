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

export default async function TasksArchivePage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const { workspace, user, features } = await requireWorkspaceContext();
  const params = await searchParams;
  const store = getStore(workspace.id);
  const statusFilter = params?.status ?? "all";
  const tasks = (await store.listTasks()).filter((task) => {
    if (task.status === "PENDING") return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "done") return task.status === "DONE";
    if (statusFilter === "skipped") return task.status === "SKIPPED";
    return true;
  });
  const doneCount = tasks.filter((task) => task.status === "DONE").length;
  const skippedCount = tasks.filter((task) => task.status === "SKIPPED").length;
  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${active ? "border-slate-500 bg-slate-800 text-white" : "border-slate-800 text-slate-300"}`;
  const makeFilterLink = (value: string) =>
    withParams("/tasks/archive", { status: value === "all" ? undefined : value });

  return (
    <PageShell
      workspaceName={workspace.name}
      isAdmin={user.isAdmin}
      features={features}
      title="Tasks archive"
      subtitle="Completed or skipped manual tasks."
      actions={
        <Link
          href={withParams("/tasks", {
            status: statusFilter === "all" ? undefined : statusFilter,
          })}
          className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
        >
          Back to tasks
        </Link>
      }
    >
      <PurposeCard>
        Review completed or skipped tasks for auditing and follow-up.
      </PurposeCard>
      <section className="flex flex-wrap gap-2">
        {[
          { label: "All", value: "all" },
          { label: "Done", value: "done" },
          { label: "Skipped", value: "skipped" },
        ].map((item) => (
          <Link key={item.value} href={makeFilterLink(item.value)} className={chipClass(statusFilter === item.value)}>
            {item.label}
          </Link>
        ))}
      </section>
      <section className="flex flex-wrap gap-3">
        <span className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300">
          Done: {doneCount}
        </span>
        <span className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300">
          Skipped: {skippedCount}
        </span>
      </section>
      <section className="grid gap-4">
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-500">
            No archived tasks yet.
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-200"
            >
              <div className="font-semibold text-slate-100">{task.title}</div>
              <div className="text-xs text-slate-500">Due {new Date(task.dueAt).toLocaleString()}</div>
              <div className="text-xs text-slate-400">Status: {task.status}</div>
            </div>
          ))
        )}
      </section>
    </PageShell>
  );
}
