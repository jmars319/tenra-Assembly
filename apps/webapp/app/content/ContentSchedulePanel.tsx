"use client";

import { useState } from "react";

type ScheduleProposal = {
  id: string;
  status: string;
  channel: string;
  scheduledFor: string | Date;
  rationale?: string | null;
  assumptions?: string | null;
};

export default function ContentSchedulePanel({
  contentItemId,
  status,
  proposals,
}: {
  contentItemId: string;
  status: string;
  proposals: ScheduleProposal[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<ScheduleProposal | null>(proposals[0] ?? null);

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const propose = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/schedules/propose-from-content", {
        method: "POST",
        headers,
        body: JSON.stringify({ contentItemId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to propose schedule.");
        return;
      }
      setCurrent(data.proposal);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (nextStatus: string) => {
    if (!current) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/content/schedules/${current.id}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update schedule status.");
        return;
      }
      setCurrent(data.proposal);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-sm font-semibold text-slate-200">Scheduler</div>
      {current ? (
        <div className="mt-3 space-y-2 text-sm text-slate-300">
          <div>Status: {current.status}</div>
          <div>Channel: {current.channel}</div>
          <div>Scheduled for: {new Date(current.scheduledFor).toLocaleString()}</div>
          {current.rationale ? <div className="text-xs text-slate-400">Rationale: {current.rationale}</div> : null}
          {current.assumptions ? (
            <div className="text-xs text-slate-400">Assumptions: {current.assumptions}</div>
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
        <div className="mt-3 text-sm text-slate-400">
          No schedule proposal yet. Create one after approval.
        </div>
      )}
      <div className="mt-4">
        <button
          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 disabled:opacity-60"
          onClick={propose}
          disabled={loading || status !== "APPROVED"}
        >
          {loading ? "Working..." : "Send to Scheduler"}
        </button>
        {status !== "APPROVED" ? (
          <div className="mt-2 text-xs text-slate-500">Approve this content before scheduling.</div>
        ) : null}
        {error ? <div className="mt-2 text-xs text-rose-300">{error}</div> : null}
      </div>
    </div>
  );
}
