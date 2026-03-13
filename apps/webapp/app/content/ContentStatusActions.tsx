"use client";

import { useState } from "react";
import type { ValidationIssue } from "@/lib/content/types";

const statuses = ["DRAFT", "READY", "APPROVED", "REJECTED", "ARCHIVED"] as const;

export default function ContentStatusActions({ id }: { id: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<ValidationIssue[]>([]);
  const [warnings, setWarnings] = useState<ValidationIssue[]>([]);
  const [lastAttemptedStatus, setLastAttemptedStatus] = useState<string | null>(null);

  const updateStatus = async (nextStatus: string) => {
    setError([]);
    setWarnings([]);
    setLastAttemptedStatus(nextStatus);
    const res = await fetch(`/api/content/items/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data?.validation?.errors || [{ code: "status_failed", message: data.error || "Status update failed." }]);
      setWarnings(data?.validation?.warnings || []);
      return;
    }
    setStatus(nextStatus);
  };

  const showRequirementsLink =
    error.length > 0 && (lastAttemptedStatus === "READY" || lastAttemptedStatus === "APPROVED");

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-sm font-semibold text-slate-200">Status actions</div>
      <div className="mt-1 text-xs text-slate-400">
        DRAFT saves anything workable. READY requires the stricter shape shown below.
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {statuses.map((next) => (
          <button
            key={next}
            onClick={() => updateStatus(next)}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-emerald-400/60"
          >
            Mark {next.toLowerCase()}
          </button>
        ))}
      </div>
      {status ? <div className="mt-3 text-xs text-emerald-300">Updated to {status}.</div> : null}
      {error.length > 0 ? (
        <div className="mt-3 space-y-2 text-xs text-rose-200">
          {error.map((issue, index) => (
            <div key={`${issue.code}-${index}`}>
              <div className="font-semibold">{issue.message}</div>
              {issue.hint ? <div className="text-rose-300">{issue.hint}</div> : null}
            </div>
          ))}
          {showRequirementsLink ? (
            <a href="#requirements" className="inline-flex items-center gap-2 text-xs text-rose-100 underline">
              View requirements
            </a>
          ) : null}
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <div className="mt-3 space-y-2 text-xs text-amber-200">
          {warnings.map((issue, index) => (
            <div key={`${issue.code}-${index}`}>
              <div className="font-semibold">{issue.message}</div>
              {issue.hint ? <div className="text-amber-300">{issue.hint}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
