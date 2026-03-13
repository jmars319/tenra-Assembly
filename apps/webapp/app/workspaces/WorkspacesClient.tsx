"use client";

import { useState } from "react";

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  role: "OWNER" | "MEMBER" | "ADMIN";
  active: boolean;
};

type InviteResponse = {
  ok: boolean;
  inviteUrl?: string;
  error?: string;
};

type Props = {
  workspaces: WorkspaceRow[];
  activeWorkspaceId: string;
  canInvite: boolean;
  canCreate: boolean;
};

export default function WorkspacesClient({ workspaces, activeWorkspaceId, canInvite, canCreate }: Props) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"OWNER" | "MEMBER">("MEMBER");
  const [inviteStatus, setInviteStatus] = useState<InviteResponse | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [createStatus, setCreateStatus] = useState<InviteResponse | null>(null);

  const handleSwitch = async (workspaceId: string) => {
    setSwitching(workspaceId);
    setInviteStatus(null);
    try {
      const res = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (res.ok) {
        window.location.href = "/dashboard";
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string };
      setInviteStatus({ ok: false, error: data?.error ?? "Unable to switch workspace." });
    } finally {
      setSwitching(null);
    }
  };

  const submitInvite = async () => {
    setInviteStatus(null);
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setInviteStatus({ ok: false, error: "Email is required." });
      return;
    }
    const res = await fetch("/api/workspaces/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: inviteRole }),
    });
    const data = (await res.json().catch(() => null)) as InviteResponse;
    if (!res.ok) {
      setInviteStatus({ ok: false, error: data?.error ?? "Invite failed." });
      return;
    }
    setInviteStatus({ ok: true, inviteUrl: data?.inviteUrl });
    setInviteEmail("");
  };

  const submitWorkspace = async () => {
    setCreateStatus(null);
    const name = workspaceName.trim();
    if (!name) {
      setCreateStatus({ ok: false, error: "Workspace name is required." });
      return;
    }
    const res = await fetch("/api/workspaces/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug: workspaceSlug.trim(),
      }),
    });
    const data = (await res.json().catch(() => null)) as InviteResponse;
    if (!res.ok) {
      setCreateStatus({ ok: false, error: data?.error ?? "Workspace creation failed." });
      return;
    }
    setWorkspaceName("");
    setWorkspaceSlug("");
    window.location.href = "/workspaces";
  };

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 text-sm font-semibold text-slate-200">Your workspaces</div>
        <div className="grid gap-3">
          {workspaces.length === 0 ? (
            <div className="text-sm text-slate-400">No workspaces available.</div>
          ) : (
            workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-white">{workspace.name}</div>
                  <div className="text-xs text-slate-500">
                    {workspace.slug} · {workspace.role}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSwitch(workspace.id)}
                  disabled={switching === workspace.id}
                  className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500 disabled:opacity-60"
                >
                  {workspace.id === activeWorkspaceId ? "Active" : switching === workspace.id ? "Switching..." : "Switch"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {canInvite ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-200">Invite a teammate</div>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
            <input
              type="email"
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            />
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as "OWNER" | "MEMBER")}
              className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            >
              <option value="MEMBER">Member</option>
              <option value="OWNER">Owner</option>
            </select>
            <button
              type="button"
              onClick={submitInvite}
              className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300"
            >
              Send invite
            </button>
          </div>
          {inviteStatus?.error ? (
            <div className="mt-3 text-xs text-rose-300">{inviteStatus.error}</div>
          ) : null}
          {inviteStatus?.inviteUrl ? (
            <div className="mt-3 text-xs text-emerald-200">
              Invite link:{" "}
              <a className="underline" href={inviteStatus.inviteUrl}>
                {inviteStatus.inviteUrl}
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      {canCreate ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-1 text-sm font-semibold text-slate-200">Create workspace</div>
          <div className="mb-3 text-xs text-slate-400">Admins only. Slug auto-generates if blank.</div>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
            <input
              type="text"
              placeholder="Workspace name"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            />
            <input
              type="text"
              placeholder="optional-slug"
              value={workspaceSlug}
              onChange={(event) => setWorkspaceSlug(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            />
            <button
              type="button"
              onClick={submitWorkspace}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white"
            >
              Create
            </button>
          </div>
          {createStatus?.error ? (
            <div className="mt-3 text-xs text-rose-300">{createStatus.error}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
