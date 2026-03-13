import PageShell from "@/app/components/PageShell";
import ContentNewClient from "@/app/content/new/ContentNewClient";
import { requireWorkspaceContext } from "@/lib/workspace/context";

export default async function ContentNewPage() {
  const { workspace, user, features } = await requireWorkspaceContext();
  const isDb = process.env.STORAGE_MODE === "db";
  const enabled = user.isAdmin || features.CONTENT_OPS;

  return (
    <PageShell
      workspaceName={workspace.name}
      isAdmin={user.isAdmin}
      features={features}
      title="New content"
      subtitle="Create typed content artifacts for review and scheduling."
    >
      {!enabled ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          Content Ops is disabled for this workspace.
        </div>
      ) : !isDb ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          Content Ops requires DB mode. Set `STORAGE_MODE=db` and `DATABASE_URL`.
        </div>
      ) : (
        <ContentNewClient />
      )}
    </PageShell>
  );
}
