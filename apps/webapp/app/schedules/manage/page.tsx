import PageShell from "@/app/components/PageShell";
import PurposeCard from "@/app/components/PurposeCard";
import SchedulesManageClient from "@/app/schedules/manage/SchedulesManageClient";
import { getStore } from "@/lib/store";
import { requireWorkspaceContext } from "@/lib/workspace/context";

export default async function SchedulesManagePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string>>;
}) {
  void searchParams;
  const { workspace, user, features } = await requireWorkspaceContext();
  const enabled = user.isAdmin || features.SCHEDULING;
  const store = getStore(workspace.id);
  const [posts, schedules] = await Promise.all([store.listPosts(), store.listSchedules()]);

  return (
    <PageShell
      title="Manage schedules"
      subtitle="Create schedule proposals."
      workspaceName={workspace.name}
      isAdmin={user.isAdmin}
      features={features}
    >
      <PurposeCard>
        Manually create schedule proposals for posts and send them through review.
      </PurposeCard>
      {!enabled ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          Scheduling is disabled for this workspace.
        </div>
      ) : (
        <SchedulesManageClient posts={posts} schedules={schedules} />
      )}
    </PageShell>
  );
}
