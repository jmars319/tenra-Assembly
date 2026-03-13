import PageShell from "@/app/components/PageShell";
import { getCoverageMatrix } from "@/lib/content/service";
import { requireWorkspaceContext } from "@/lib/workspace/context";

export default async function CoveragePage({
  searchParams,
}: {
  searchParams?: Record<string, string>;
}) {
  void searchParams;
  const { workspace, user, features } = await requireWorkspaceContext();
  const isDb = process.env.STORAGE_MODE === "db";
  const enabled = user.isAdmin || features.CONTENT_OPS;

  if (!enabled) {
    return (
      <PageShell
        title="Coverage"
        subtitle="Content Ops is disabled for this workspace."
        workspaceName={workspace.name}
        isAdmin={user.isAdmin}
        features={features}
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
        title="Coverage"
        subtitle="Content Ops requires DB mode."
        workspaceName={workspace.name}
        isAdmin={user.isAdmin}
        features={features}
      >
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          Set `STORAGE_MODE=db` and `DATABASE_URL`.
        </div>
      </PageShell>
    );
  }

  const data = await getCoverageMatrix(workspace.id);
  const topics = Object.keys(data.matrix).sort();

  return (
    <PageShell
      title="Coverage"
      subtitle="Topic coverage across blog features, systems memos, and field notes."
      workspaceName={workspace.name}
      isAdmin={user.isAdmin}
      features={features}
    >
      {topics.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          No coverage data yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3">Blog</th>
                <th className="px-4 py-3">Systems</th>
                <th className="px-4 py-3">Field Notes</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((topic) => (
                <tr key={topic} className="border-t border-slate-800">
                  <td className="px-4 py-3 text-slate-100">{topic}</td>
                  <td className="px-4 py-3">{data.matrix[topic].BLOG_FEATURE}</td>
                  <td className="px-4 py-3">{data.matrix[topic].SYSTEMS_MEMO}</td>
                  <td className="px-4 py-3">{data.matrix[topic].FIELD_NOTE}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
