import PageShell from "@/app/components/PageShell";
import PurposeCard from "@/app/components/PurposeCard";
import BriefsClient from "@/app/briefs/BriefsClient";
import { getStore } from "@/lib/store";
import { requireWorkspaceContext } from "@/lib/workspace/context";

export default async function BriefsPage() {
  const { workspace, user, features } = await requireWorkspaceContext();
  const enabled = user.isAdmin || features.AI_BRIEFS;

  if (!enabled) {
    return (
      <PageShell
        workspaceName={workspace.name}
        isAdmin={user.isAdmin}
        features={features}
        title="Briefs"
        subtitle="Briefs are disabled for this workspace."
      >
        <PurposeCard>
          Ask a workspace owner to enable Briefs in Settings.
        </PurposeCard>
      </PageShell>
    );
  }
  const store = getStore(workspace.id);
  const [briefs, projects, repos] = await Promise.all([
    store.listBriefs(),
    store.listProjects(),
    store.listRepos(),
  ]);

  return (
    <PageShell
      workspaceName={workspace.name}
      isAdmin={user.isAdmin}
      features={features}
      title="Briefs"
      subtitle="Create and manage review briefs."
    >
      <PurposeCard>
        Define the context and constraints used to generate posts for review.
      </PurposeCard>
      <BriefsClient briefs={briefs} projects={projects} repos={repos} />
    </PageShell>
  );
}
