import PageShell from "@/app/components/PageShell";
import PurposeCard from "@/app/components/PurposeCard";
import TasksManageClient from "@/app/tasks/manage/TasksManageClient";
import { getStore } from "@/lib/store";
import { requireWorkspaceContext } from "@/lib/workspace/context";

export default async function TasksManagePage() {
  const { workspace, user, features } = await requireWorkspaceContext();
  const store = getStore(workspace.id);
  const [tasks, projects] = await Promise.all([store.listTasks(), store.listProjects()]);

  return (
    <PageShell
      workspaceName={workspace.name}
      isAdmin={user.isAdmin}
      features={features}
      title="Manage tasks"
      subtitle="Create and review manual tasks."
    >
      <PurposeCard>
        Create manual tasks tied to projects, then track them through completion.
      </PurposeCard>
      <TasksManageClient tasks={tasks} projects={projects} />
    </PageShell>
  );
}
