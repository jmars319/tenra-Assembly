import Link from "next/link";

import type { GeneratedDraft, StyleOption } from "./ContentNewTypes";

export function ContentNewDraftPanel({
  aiAvailable,
  aiStatus,
  generatedDraft,
  generating,
  handleGenerateDraft,
  rawInput,
  setRawInput,
  setStylePresetId,
  setUploadFiles,
  styleOptions,
  stylePresetId,
  uploadFiles,
}: {
  aiAvailable: boolean | null;
  aiStatus: string | null;
  generatedDraft: GeneratedDraft | null;
  generating: boolean;
  handleGenerateDraft: () => Promise<void>;
  rawInput: string;
  setRawInput: (value: string) => void;
  setStylePresetId: (value: string) => void;
  setUploadFiles: (files: File[]) => void;
  styleOptions: StyleOption[];
  stylePresetId: string;
  uploadFiles: File[];
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="text-sm font-semibold text-slate-200">AI draft</div>
      <p className="mt-2 text-sm text-slate-400">
        Generate a draft from base material. You can edit everything after generation before marking READY.
      </p>
      {!aiAvailable ? (
        <div className="mt-3 text-xs text-rose-300">{aiStatus ?? "AI Assist is not configured."}</div>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {styleOptions.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setStylePresetId(preset.id)}
            className={`rounded-xl border px-4 py-3 text-left text-sm ${
              stylePresetId === preset.id
                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-100"
                : "border-slate-800 bg-slate-950/40 text-slate-300"
            }`}
          >
            <div className="font-semibold">{preset.name}</div>
            <div className="mt-1 text-xs text-slate-400">
              {preset.description || (preset.source === "workspace" ? "Workspace style." : "Preset style.")}
            </div>
          </button>
        ))}
      </div>
      <div className="mt-5 text-sm text-slate-300">Base material</div>
      <textarea
        className="mt-2 min-h-[140px] w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        placeholder="Paste notes, snippets, or a rough outline."
        value={rawInput}
        onChange={(event) => setRawInput(event.target.value)}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="file"
          multiple
          className="text-sm text-slate-300"
          onChange={(event) => setUploadFiles(Array.from(event.target.files ?? []))}
        />
        <button
          className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 disabled:opacity-60"
          onClick={() => void handleGenerateDraft()}
          disabled={!aiAvailable || generating}
        >
          {generating ? "Generating..." : "Generate draft"}
        </button>
        {generating ? <div className="text-xs text-slate-500">Working...</div> : null}
      </div>
      {uploadFiles.length ? (
        <div className="mt-2 text-xs text-slate-400">
          Files: {uploadFiles.map((file) => file.name).join(", ")}
        </div>
      ) : null}
      {generatedDraft ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Raw input</div>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-300">
              {generatedDraft.rawInput || rawInput || "—"}
            </pre>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">AI draft</div>
            <div className="mt-2 text-sm text-slate-100">
              <div className="font-semibold">{generatedDraft.title || "Untitled"}</div>
              <div className="mt-2 text-xs text-slate-400">{generatedDraft.summary || "No summary yet."}</div>
              <div className="mt-3 whitespace-pre-wrap text-xs text-slate-300">
                {generatedDraft.body || "No body generated."}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {generatedDraft?.aiMeta ? (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-300">
          <div className="text-xs uppercase tracking-wide text-slate-500">Assumptions & questions</div>
          <div className="mt-2 space-y-2">
            <div>
              <div className="text-slate-400">Assumptions</div>
              <ul className="mt-1 list-disc pl-5">
                {(generatedDraft.aiMeta.assumptions ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-slate-400">Open questions</div>
              <ul className="mt-1 list-disc pl-5">
                {(generatedDraft.aiMeta.openQuestions ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-slate-400">Missing evidence</div>
              <ul className="mt-1 list-disc pl-5">
                {(generatedDraft.aiMeta.missingEvidence ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          {generatedDraft.id ? (
            <div className="mt-4">
              <Link href={`/content/${generatedDraft.id}`} className="text-xs text-emerald-200 underline">
                Open draft for editing
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
