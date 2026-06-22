"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type StatusResponse = {
  connected: boolean;
  reason?: string;
  missing?: string[];
  accountLogin?: string;
  accountType?: string;
  repoCount?: number;
  selectedCount?: number;
};

type Repo = {
  id: string;
  repoId: number;
  fullName: string;
  name: string;
  private: boolean;
  ownerLogin: string;
  selected: boolean;
  lastSeenAt?: string | null;
};

const internalRepoNames = new Set(["jmars319/assembly", "jason_marshall/ledger"]);

// GitHub integration boundary
export default function GitHubIntegrationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectedNotice = searchParams.get("connected");
  const errorNotice = searchParams.get("error");
  const installationIdParam = searchParams.get("installation_id");

  // Repository sync boundary
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusRes = await fetch("/api/github/status");
      if (!statusRes.ok) {
        setStatus({ connected: false, reason: "forbidden" });
        setRepos([]);
        setSelectedIds(new Set());
        setError("GitHub integration is disabled for this workspace.");
        return;
      }
      const statusBody = (await statusRes.json()) as StatusResponse;
      setStatus(statusBody);

      if (statusBody.connected) {
        const reposRes = await fetch("/api/github/repos");
        const reposBody = (await reposRes.json()) as { repos: Repo[] };
        const filtered = (reposBody.repos ?? []).filter((repo) => !internalRepoNames.has(repo.fullName.toLowerCase()));
        setRepos(filtered);
        setSelectedIds(new Set(filtered.filter((repo) => repo.selected).map((repo) => repo.repoId)));
      } else {
        setRepos([]);
        setSelectedIds(new Set());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load GitHub status.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Installation callback boundary
  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!installationIdParam) return;
    const installationId = Number(installationIdParam);
    if (!Number.isFinite(installationId) || installationId <= 0) return;

    const complete = async () => {
      try {
        await fetch("/api/github/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ installationId }),
        });
      } finally {
        router.replace("/settings/integrations/github?connected=1");
        await load();
      }
    };

    void complete();
  }, [installationIdParam, router, load]);

  // Repository selection boundary
  const toggleRepo = (repoId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
  };

  const saveSelection = async () => {
    setState("saving");
    setError(null);
    const res = await fetch("/api/github/selection", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ repoIds: Array.from(selectedIds) }),
    });
    if (!res.ok) {
      setState("error");
      setError("Failed to save repo selection.");
      return;
    }
    setState("saved");
    await load();
  };

  const syncRepos = async () => {
    setSyncing(true);
    setError(null);
    const res = await fetch("/api/github/sync", {
      method: "POST",
    });
    if (!res.ok) {
      setError("Failed to sync repos.");
    }
    setSyncing(false);
    await load();
  };

  const disconnect = async () => {
    if (!confirm("Disconnect GitHub and clear stored repos?")) return;
    setDisconnecting(true);
    setError(null);
    const res = await fetch("/api/github/disconnect", {
      method: "POST",
    });
    if (!res.ok) {
      setError("Failed to disconnect GitHub.");
    }
    setDisconnecting(false);
    await load();
  };

  const repoCountLabel = useMemo(() => {
    if (!status?.connected) return "0 repos";
    const count = status.repoCount ?? repos.length;
    return `${count} repos`;
  }, [status, repos.length]);

  return (
    <div className="grid gap-6">
      {/* Connection status boundary */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-200">Connection</div>
            <div className="mt-1 text-xs text-slate-500">
              {status?.connected
                ? `Connected as ${status.accountLogin} (${status.accountType}). ${repoCountLabel}.`
                : "Not connected to GitHub."}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!status?.connected ? (
              <a
                href="/api/github/install"
                className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200"
              >
                Connect GitHub
              </a>
            ) : (
              <>
                <button
                  onClick={syncRepos}
                  className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200"
                >
                  {syncing ? "Syncing..." : "Sync repos"}
                </button>
                <button
                  onClick={disconnect}
                  className="rounded-lg border border-rose-900/60 px-3 py-1 text-xs text-rose-200"
                >
                  {disconnecting ? "Disconnecting..." : "Disconnect"}
                </button>
              </>
            )}
          </div>
        </div>

        {status?.reason === "missing_env" ? (
          <div className="mt-3 text-xs text-rose-300">
            GitHub env vars missing: {(status.missing ?? []).join(", ")}.
          </div>
        ) : null}
        {status?.reason === "storage_mode" ? (
          <div className="mt-3 text-xs text-rose-300">
            GitHub integration requires STORAGE_MODE=db.
          </div>
        ) : null}
        {connectedNotice ? (
          <div className="mt-3 text-xs text-emerald-300">GitHub connected.</div>
        ) : null}
        {errorNotice ? (
          <div className="mt-3 text-xs text-rose-300">GitHub connection failed.</div>
        ) : null}
      </div>

      {/* Repository access boundary */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-200">Repository access</div>
              <div className="text-xs text-slate-500">
                Select repos Assembly is allowed to read. Unselected repos are ignored.
              </div>
            </div>
          <button
            onClick={saveSelection}
            disabled={!status?.connected || state === "saving"}
            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200"
          >
            {state === "saving" ? "Saving..." : "Save selection"}
          </button>
        </div>

        {loading ? (
          <div className="text-xs text-slate-500">Loading repositories...</div>
        ) : null}
        {!status?.connected ? (
          <div className="text-xs text-slate-500">Connect GitHub to view repositories.</div>
        ) : null}
        {status?.connected && repos.length === 0 && !loading ? (
          <div className="text-xs text-slate-500">No repositories available yet.</div>
        ) : null}

        <div className="grid gap-3">
          {repos.map((repo) => (
            <div
              key={repo.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200"
            >
              <div>
                <div className="font-semibold text-slate-100">{repo.fullName}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {repo.private ? "Private" : "Public"} • {repo.ownerLogin}
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={selectedIds.has(repo.repoId)}
                  onChange={() => toggleRepo(repo.repoId)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                />
                Allow
              </label>
            </div>
          ))}
        </div>

        <div className="mt-3 text-xs text-slate-500">
          {state === "saved" ? "Saved." : null}
          {state === "error" ? "Save failed." : null}
        </div>
        {error ? <div className="mt-2 text-xs text-rose-300">{error}</div> : null}
      </div>
    </div>
  );
}
