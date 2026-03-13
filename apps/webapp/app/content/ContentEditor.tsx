"use client";

import { useState } from "react";

type ContentEditorProps = {
  id: string;
  title?: string | null;
  summary?: string | null;
  body?: string | null;
  rawInput?: string | null;
  structured?: unknown;
};

export default function ContentEditor({
  id,
  title,
  summary,
  body,
  rawInput,
  structured,
}: ContentEditorProps) {
  const [nextTitle, setNextTitle] = useState(title ?? "");
  const [nextSummary, setNextSummary] = useState(summary ?? "");
  const [nextBody, setNextBody] = useState(body ?? "");
  const [nextRaw, setNextRaw] = useState(rawInput ?? "");
  const [nextStructured, setNextStructured] = useState(
    structured ? JSON.stringify(structured, null, 2) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    let structuredValue: unknown = undefined;
    if (nextStructured.trim()) {
      try {
        structuredValue = JSON.parse(nextStructured);
      } catch {
        setError("Structured JSON is invalid.");
        setSaving(false);
        return;
      }
    }

    const res = await fetch(`/api/content/items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: nextTitle,
        summary: nextSummary,
        body: nextBody,
        rawInput: nextRaw,
        structured: structuredValue ?? null,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data?.error || "Update failed.");
      setSaving(false);
      return;
    }
    setSaved(true);
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="text-sm font-semibold text-slate-200">Edit content</div>
      <div className="mt-4 grid gap-4">
        <label className="text-sm text-slate-300">
          Title
          <input
            className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            value={nextTitle}
            onChange={(event) => setNextTitle(event.target.value)}
          />
        </label>
        <label className="text-sm text-slate-300">
          Summary
          <textarea
            className="mt-2 min-h-[80px] w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            value={nextSummary}
            onChange={(event) => setNextSummary(event.target.value)}
          />
        </label>
        <label className="text-sm text-slate-300">
          Body
          <textarea
            className="mt-2 min-h-[160px] w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            value={nextBody}
            onChange={(event) => setNextBody(event.target.value)}
          />
        </label>
        <label className="text-sm text-slate-300">
          Raw input
          <textarea
            className="mt-2 min-h-[120px] w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            value={nextRaw}
            onChange={(event) => setNextRaw(event.target.value)}
          />
        </label>
        <label className="text-sm text-slate-300">
          Structured (JSON)
          <textarea
            className="mt-2 min-h-[140px] w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
            value={nextStructured}
            onChange={(event) => setNextStructured(event.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 disabled:opacity-60"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
        {saved ? <span className="text-xs text-emerald-300">Saved.</span> : null}
        {error ? <span className="text-xs text-rose-300">{error}</span> : null}
      </div>
    </div>
  );
}
