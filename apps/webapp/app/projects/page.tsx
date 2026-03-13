import PageShell from "@/app/components/PageShell";
import PurposeCard from "@/app/components/PurposeCard";
import ProjectsClient from "@/app/projects/ProjectsClient";
import { getStore } from "@/lib/store";
import { requireWorkspaceContext } from "@/lib/workspace/context";

export default async function ProjectsPage() {
  const { workspace, user, features } = await requireWorkspaceContext();
  const store = getStore(workspace.id);
  const projects = await store.listProjects();

  return (
    <PageShell
      workspaceName={workspace.name}
      isAdmin={user.isAdmin}
      features={features}
      title="Projects"
      subtitle="Manage project tags and names."
    >
      <PurposeCard>
        Keep project tags consistent so briefs, repos, and posts align to the right brand.
      </PurposeCard>
      <ProjectsClient projects={projects} />
    </PageShell>
  );
}
