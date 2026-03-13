"use client";

import { useCallback, useEffect, useState } from "react";

type StatusResponse = {
  connected: boolean;
  accountLogin?: string;
  accountType?: string;
  selectedCount?: number;
};

type Repo = {
  id: string;
  repoId: number;
  fullName: string;
  selected: boolean;
};

export default function SettingsGitHubSummary() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [selectedRepos, setSelectedRepos] = useState<Repo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const statusRes = await fetch("/api/github/status");
      if (!statusRes.ok) {
        setStatus({ connected: false });
        setSelectedRepos([]);
        setError("GitHub integration is disabled for this workspace.");
        return;
      }
      const statusBody = (await statusRes.json()) as StatusResponse;
      setStatus(statusBody);

      if (statusBody.connected) {
        const reposRes = await fetch("/api/github/repos");
        const reposBody = (await reposRes.json()) as { repos: Repo[] };
        const selected = (reposBody.repos ?? []).filter((repo) => repo.selected);
        setSelectedRepos(selected);
      } else {
        setSelectedRepos([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load GitHub status.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const connectedLabel = status?.connected
    ? `Connected as ${status.accountLogin ?? "unknown"}`
    : "Not connected";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-200">Integrations</div>
          <div className="mt-2 text-sm text-slate-400">
            GitHub: <span className="text-slate-300">{connectedLabel}</span>
          </div>
          {status?.connected ? (
            <div className="mt-2 text-xs text-slate-500">
              {selectedRepos.length} repos selected.
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status?.connected ? (
            <button
              onClick={async () => {
                setSyncing(true);
                setError(null);
                try {
                  await fetch("/api/github/selection", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ repoIds: selectedRepos.map((repo) => repo.repoId) }),
                  });
                  await load();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to sync repo access.");
                } finally {
                  setSyncing(false);
                }
              }}
              className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200"
            >
              {syncing ? "Syncing..." : "Sync repo access"}
            </button>
          ) : null}
          <a
            href="/settings/integrations/github"
            className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200"
          >
            Manage GitHub
          </a>
        </div>
      </div>

      {selectedRepos.length ? (
        <div className="mt-4 grid gap-2 text-xs text-slate-400">
          {selectedRepos.map((repo) => (
            <div key={repo.id} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
              {repo.fullName}
            </div>
          ))}
        </div>
      ) : null}

      {error ? <div className="mt-3 text-xs text-rose-300">{error}</div> : null}
    </div>
  );
}
