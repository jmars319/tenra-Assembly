import Link from "next/link";

import type { Brief, Project, RepoAccess } from "@/lib/store/types";

export function BriefsListPanel({
  activeSummary,
  filterRepo,
  filterScope,
  filteredBriefs,
  projects,
  removeBrief,
  repos,
  setActiveSummary,
  setFilterRepo,
  setFilterScope,
  withParams,
}: {
  activeSummary: string | null;
  filterRepo: string;
  filterScope: "all" | "general" | "repo";
  filteredBriefs: Brief[];
  projects: Project[];
  removeBrief: (id: string) => Promise<void>;
  repos: RepoAccess[];
  setActiveSummary: (value: string | null) => void;
  setFilterRepo: (value: string) => void;
  setFilterScope: (value: "all" | "general" | "repo") => void;
  withParams: (href: string) => string;
}) {
  return (
    <>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-200">Briefs</div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            <select
              value={filterScope}
              onChange={(event) =>
                setFilterScope(event.target.value as "all" | "general" | "repo")
              }
              className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200"
            >
              <option value="all">All briefs</option>
              <option value="general">General briefs</option>
              <option value="repo">Repo-specific</option>
            </select>
            <select
              value={filterRepo}
              onChange={(event) => setFilterRepo(event.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200"
            >
              <option value="all">All repos</option>
              {repos.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.repo}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {filteredBriefs.length === 0 ? (
            <div className="text-sm text-slate-500">No briefs yet.</div>
          ) : (
            filteredBriefs.map((brief) => (
              <div
                key={brief.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Project: {projects.find((p) => p.id === brief.projectId)?.name ?? "Unknown"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={withParams(`/briefs/${brief.id}`)}
                      className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-500"
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => void removeBrief(brief.id)}
                      className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {brief.sourceRepoId
                    ? `Repo: ${repos.find((repo) => repo.id === brief.sourceRepoId)?.repo ?? "Unknown"}`
                    : "General brief"}
                </div>
                <div className="mt-1 text-xs text-slate-500">Status: saved</div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-slate-100">{brief.summary}</div>
                {brief.summary.length > 280 ? (
                  <button
                    onClick={() => setActiveSummary(brief.summary)}
                    className="mt-2 text-xs text-slate-400 hover:text-slate-200"
                  >
                    View full summary
                  </button>
                ) : null}
                <div className="mt-2 text-xs text-slate-500">
                  Created: {new Date(brief.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {activeSummary ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-semibold text-slate-200">Brief summary</div>
              <button
                onClick={() => setActiveSummary(null)}
                className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300"
              >
                Close
              </button>
            </div>
            <div className="mt-4 whitespace-pre-wrap text-sm text-slate-100">{activeSummary}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
