import Link from "next/link";
import PageShell from "@/app/components/PageShell";
import PurposeCard from "@/app/components/PurposeCard";
import TaskActions from "@/app/components/TaskActions";
import { getStore } from "@/lib/store";
import type { Task } from "@/lib/store/types";
import { requireWorkspaceContext } from "@/lib/workspace/context";

const withParams = (href: string, params: Record<string, string | undefined>) => {
  const nextParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) nextParams.set(key, value);
  });
  const query = nextParams.toString();
  return query ? `${href}?${query}` : href;
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const { workspace, user, features } = await requireWorkspaceContext();
  const params = await searchParams;
  const store = getStore(workspace.id);
  const statusFilter = params?.status ?? "pending";
  const tasks = (await store.listTasks()).filter((task) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") return task.status === "PENDING";
    if (statusFilter === "done") return task.status === "DONE";
    if (statusFilter === "skipped") return task.status === "SKIPPED";
    return task.status === "PENDING";
  });
  const archiveLink = withParams("/tasks/archive", {
    status: statusFilter === "pending" ? undefined : statusFilter,
  });
  const manageLink = "/tasks/manage";
  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${active ? "border-slate-500 bg-slate-800 text-white" : "border-slate-800 text-slate-300"}`;
  const makeFilterLink = (value: string) =>
    withParams("/tasks", { status: value === "pending" ? undefined : value });

  return (
    <PageShell
      workspaceName={workspace.name}
      isAdmin={user.isAdmin}
      features={features}
      title="Manual tasks"
      subtitle="Upcoming items that require manual steps."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href={manageLink}
            className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
          >
            Manage tasks
          </Link>
          <Link
            href={archiveLink}
            className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
          >
            View archive
          </Link>
        </div>
      }
    >
      <PurposeCard>
        Track manual tasks that need human completion before posts can proceed.
      </PurposeCard>
      <section className="flex flex-wrap gap-2">
        {[
          { label: "Pending", value: "pending" },
          { label: "Done", value: "done" },
          { label: "Skipped", value: "skipped" },
          { label: "All", value: "all" },
        ].map((item) => (
          <Link key={item.value} href={makeFilterLink(item.value)} className={chipClass(statusFilter === item.value)}>
            {item.label}
          </Link>
        ))}
      </section>
      <section className="grid gap-4">
        {tasks.map((task: Task) => (
          <div
            key={task.id}
            className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="text-sm font-semibold text-slate-100">{task.title}</div>
              <div className="text-xs text-slate-500">Due {new Date(task.dueAt).toLocaleString()}</div>
              <div className="mt-2 text-xs text-slate-400">Status: {task.status}</div>
            </div>
            <TaskActions taskId={task.id} copyText={task.copyText} />
          </div>
        ))}
      </section>
    </PageShell>
  );
}
