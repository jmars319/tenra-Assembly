"use client";

import { useState } from "react";

type ScheduleItem = {
  id: string;
  postId: string;
  channel: string;
  scheduledFor: string;
};

type ScheduleProposal = {
  id: string;
  status: string;
  items: ScheduleItem[];
};

export default function PostSchedulePanel({
  postId,
  postStatus,
}: {
  postId: string;
  postStatus: string;
}) {
  const [proposal, setProposal] = useState<ScheduleProposal | null>(null);
  const [suggestion, setSuggestion] = useState<{ rationale?: string; assumptions?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const propose = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/schedules/propose-from-post", {
        method: "POST",
        headers,
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to propose schedule.");
        return;
      }
      setProposal(data.schedule);
      setSuggestion(data.suggestion ?? null);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (nextStatus: "APPROVED" | "REVISION_REQUESTED" | "REJECTED") => {
    if (!proposal) return;
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        nextStatus === "APPROVED"
          ? `/api/schedules/${proposal.id}/approve`
          : nextStatus === "REJECTED"
            ? `/api/schedules/${proposal.id}/reject`
            : `/api/schedules/${proposal.id}/revise`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setError(payload.error || "Failed to update schedule.");
        return;
      }
      const updated = await res.json();
      setProposal({
        id: updated.id,
        status: updated.status,
        items: updated.items ?? proposal.items,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-sm font-semibold text-slate-200">AI scheduler</div>
      {proposal ? (
        <div className="mt-3 space-y-2 text-sm text-slate-300">
          <div>Status: {proposal.status}</div>
          {proposal.items.map((item) => (
            <div key={item.id}>
              Channel: {item.channel} · {new Date(item.scheduledFor).toLocaleString()}
            </div>
          ))}
          {suggestion?.rationale ? (
            <div className="text-xs text-slate-400">Rationale: {suggestion.rationale}</div>
          ) : null}
          {suggestion?.assumptions ? (
            <div className="text-xs text-slate-400">Assumptions: {suggestion.assumptions}</div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
              onClick={() => updateStatus("APPROVED")}
              disabled={loading}
            >
              Approve
            </button>
            <button
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
              onClick={() => updateStatus("REVISION_REQUESTED")}
              disabled={loading}
            >
              Request revision
            </button>
            <button
              className="rounded-full border border-rose-900/60 px-3 py-1 text-xs text-rose-200"
              onClick={() => updateStatus("REJECTED")}
              disabled={loading}
            >
              Reject
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-sm text-slate-400">No proposal yet. Generate after approval.</div>
      )}
      <div className="mt-4">
        <button
          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 disabled:opacity-60"
          onClick={propose}
          disabled={loading || postStatus !== "APPROVED"}
        >
          {loading ? "Working..." : "Send to Scheduler"}
        </button>
        {postStatus !== "APPROVED" ? (
          <div className="mt-2 text-xs text-slate-500">Approve this post before scheduling.</div>
        ) : null}
        {error ? <div className="mt-2 text-xs text-rose-300">{error}</div> : null}
      </div>
    </div>
  );
}
