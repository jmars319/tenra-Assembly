"use client";

import { useState } from "react";

type AssistMode = "sanitize" | "structure" | "summarize";

export default function ContentAssistPanel({ id }: { id: string }) {
  const [mode, setMode] = useState<AssistMode>("sanitize");
  const [preview, setPreview] = useState<{ before: unknown; after: unknown } | null>(null);
  const [suggested, setSuggested] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);

  const apiFetch = (url: string, init: RequestInit) => {
    const headers = new Headers(init.headers || {});
    return fetch(url, { ...init, headers });
  };

  const requestAssist = async () => {
    setError(null);
    setStatus(null);
    setLoading(true);
    const res = await apiFetch(`/api/content/items/${id}/assist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data?.validation?.errors?.[0]?.message || data.error || "Assist failed.");
      setLoading(false);
      return;
    }
    setPreview(data.preview);
    setSuggested(data.suggested);
    setLoading(false);
  };

  const applyAssist = async () => {
    if (!suggested) return;
    setApplyLoading(true);
    const res = await apiFetch(`/api/content/items/${id}/assist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, apply: true, suggested }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data?.validation?.errors?.[0]?.message || data.error || "Apply failed.");
      setApplyLoading(false);
      return;
    }
    setStatus("Applied suggestions.");
    setApplyLoading(false);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-sm font-semibold text-slate-200">AI assist (optional)</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["sanitize", "structure", "summarize"] as AssistMode[]).map((value) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={`rounded-full border px-3 py-1 text-xs ${
              mode === value ? "border-emerald-400 text-emerald-200" : "border-slate-700 text-slate-300"
            }`}
          >
            {value}
          </button>
        ))}
        <button
          onClick={requestAssist}
          disabled={loading}
          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 disabled:opacity-60"
        >
          {loading ? "Working..." : "Preview suggestions"}
        </button>
      </div>
      {loading ? <div className="mt-3 text-xs text-slate-500">Working...</div> : null}

      {error ? <div className="mt-3 text-xs text-rose-200">{error}</div> : null}
      {status ? <div className="mt-3 text-xs text-emerald-300">{status}</div> : null}

      {preview ? (
        <div className="mt-4 space-y-3 text-xs text-slate-300">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Before</div>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-2">
              {JSON.stringify(preview.before, null, 2)}
            </pre>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">After</div>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-2">
              {JSON.stringify(preview.after, null, 2)}
            </pre>
          </div>
          <button
            onClick={applyAssist}
            disabled={applyLoading}
            className="rounded-full border border-emerald-400/60 px-3 py-1 text-xs text-emerald-200 disabled:opacity-60"
          >
            {applyLoading ? "Working..." : "Apply changes"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
