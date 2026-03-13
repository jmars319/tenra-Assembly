"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ValidationIssue } from "@/lib/content/types";
import { getRequirements } from "@/lib/content/requirementsCopy";
import { stylePresets } from "@/lib/content/stylePresets";
import Link from "next/link";

const contentTypeOptions = [
  { value: "FIELD_NOTE", label: "Field Note" },
  { value: "PROJECT_NOTE", label: "Project Note" },
  { value: "SYSTEMS_MEMO", label: "Systems Memo" },
  { value: "BLOG_FEATURE", label: "Blog Feature" },
  { value: "CHANGE_LOG", label: "Change Log" },
  { value: "DECISION_RECORD", label: "Decision Record" },
  { value: "SIGNAL_LOG", label: "Signal Log" },
];

const statusOptions = ["DRAFT", "READY", "APPROVED", "REJECTED", "ARCHIVED"];

const cadenceOptions = ["", "MONTHLY", "BIMONTHLY", "QUARTERLY", "SIX_WEEKS", "AD_HOC"];

type GeneratedDraft = {
  id: string;
  title?: string | null;
  summary?: string | null;
  body?: string | null;
  rawInput?: string | null;
  aiMeta?: {
    assumptions?: string[];
    openQuestions?: string[];
    missingEvidence?: string[];
    stylePresetId?: string;
    promptVersion?: string;
  };
};

type StyleOption = {
  id: string;
  name: string;
  description?: string | null;
  source: "preset" | "workspace";
};

export default function ContentNewClient() {
  const [type, setType] = useState("FIELD_NOTE");
  const [status, setStatus] = useState("DRAFT");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [topics, setTopics] = useState("");
  const [relatedSlugs, setRelatedSlugs] = useState("");
  const [cadenceTarget, setCadenceTarget] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [format, setFormat] = useState<"md" | "json">("md");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<ValidationIssue[]>([]);
  const [warnings, setWarnings] = useState<ValidationIssue[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<GeneratedDraft | null>(null);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [stylePresetId, setStylePresetId] = useState(stylePresets[0]?.id ?? "neutral-brief");
  const [styleOptions, setStyleOptions] = useState<StyleOption[]>(
    stylePresets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      source: "preset",
    })),
  );
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);

  const [projectNoteRow, setProjectNoteRow] = useState({
    caseStudySlug: "",
    date: "",
    metric: "",
    detail: "",
    sourceLink: "",
  });

  const [changeLog, setChangeLog] = useState({ date: "", change: "", impact: "" });
  const [decision, setDecision] = useState({ context: "", decision: "", tradeoffs: "", outcome: "" });
  const [signal, setSignal] = useState({ date: "", signal: "", tags: "", link: "" });

  const apiFetch = useCallback(async (url: string, init: RequestInit) => {
    const headers = new Headers(init.headers || {});
    return fetch(url, { ...init, headers });
  }, []);

  const resetFeedback = () => {
    setErrors([]);
    setWarnings([]);
    setSuccess(null);
    setAiWarnings([]);
  };

  const openPanelsForIssues = (issues: ValidationIssue[]) => {
    if (!issues.length) return;
    if (status === "READY" || status === "APPROVED") {
      setRequirementsOpen(true);
    }
    const inputIssue = issues.some((issue) =>
      ["rawInput", "project_note", "change_log", "decision_record", "signal_log"].includes(issue.field ?? ""),
    );
    if (inputIssue) {
      setPasteOpen(true);
    }
  };

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await apiFetch("/api/ai/status", { method: "GET" });
        const data = await res.json();
        setAiAvailable(Boolean(data?.configured));
        setAiStatus(Boolean(data?.configured) ? null : "AI Assist is not configured.");
      } catch {
        setAiAvailable(false);
        setAiStatus("AI Assist status could not be checked.");
      }
    };
    void loadStatus();
  }, [apiFetch]);

  useEffect(() => {
    const loadStyles = async () => {
      try {
        const [stylesRes, prefRes] = await Promise.all([
          apiFetch("/api/workspaces/styles", { method: "GET" }),
          apiFetch("/api/workspaces/style-preference", { method: "GET" }),
        ]);
        if (stylesRes.ok) {
          const data = await stylesRes.json();
          const workspaceStyles = Array.isArray(data?.styles)
            ? data.styles.map((style: { id: string; name: string; description?: string | null }) => ({
                id: style.id,
                name: style.name,
                description: style.description ?? null,
                source: "workspace" as const,
              }))
            : [];
          setStyleOptions([
            ...stylePresets.map((preset) => ({
              id: preset.id,
              name: preset.name,
              description: preset.description,
              source: "preset" as const,
            })),
            ...workspaceStyles,
          ]);
        }
        if (prefRes.ok) {
          const data = await prefRes.json();
          const preferred = data?.preference?.defaultStyleId;
          if (typeof preferred === "string" && preferred) {
            setStylePresetId(preferred);
          }
        }
      } catch {
        // keep defaults
      }
    };
    void loadStyles();
  }, [apiFetch]);

  const handleCreate = async () => {
    resetFeedback();
    const payload: Record<string, unknown> = {
      type,
      status,
      title: title || null,
      summary: summary || null,
      topics,
      relatedSlugs,
      cadenceTarget: cadenceTarget || null,
    };

    if (type === "FIELD_NOTE" || type === "SYSTEMS_MEMO" || type === "BLOG_FEATURE") {
      payload.rawInput = rawInput;
    }

    if (type === "SYSTEMS_MEMO") {
      payload.format = format;
    }

    if (type === "PROJECT_NOTE") {
      payload.structured = {
        caseStudySlug: projectNoteRow.caseStudySlug,
        date: projectNoteRow.date,
        metric: projectNoteRow.metric,
        detail: projectNoteRow.detail,
        sourceLink: projectNoteRow.sourceLink || null,
      };
    }

    if (type === "CHANGE_LOG") {
      payload.structured = changeLog;
    }

    if (type === "DECISION_RECORD") {
      payload.structured = decision;
    }

    if (type === "SIGNAL_LOG") {
      payload.structured = {
        date: signal.date,
        signal: signal.signal,
        tags: signal.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        link: signal.link || null,
      };
    }

    const res = await apiFetch("/api/content/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      setErrors(data?.validation?.errors || [{ code: "create_failed", message: data.error || "Create failed." }]);
      setWarnings(data?.validation?.warnings || []);
      openPanelsForIssues(data?.validation?.errors || []);
      return;
    }

    setWarnings(data.validation?.warnings || []);
    setSuccess("Content item created.");
  };

  const handleUpload = async () => {
    resetFeedback();
    if (uploadFiles.length === 0) {
      setErrors([{ code: "upload_missing", message: "Select a file to upload." }]);
      return;
    }
    const formData = new FormData();
    formData.set("type", type);
    formData.set("status", status);
    formData.set("format", format);
    uploadFiles.forEach((file) => formData.append("files", file));

    const res = await apiFetch("/api/content/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setErrors(data?.validation?.errors || [{ code: "upload_failed", message: data.error || "Upload failed." }]);
      return;
    }
    setAiWarnings(data.warnings || []);
    setWarnings(data.validation?.warnings || []);
    setSuccess("Upload processed.");
  };

  const handleGenerateDraft = async () => {
    resetFeedback();
    if (!aiAvailable) {
      setErrors([{ code: "ai_missing", message: "AI Assist is not configured." }]);
      return;
    }
    if (!rawInput.trim() && uploadFiles.length === 0) {
      setErrors([{ code: "ai_missing_input", message: "Provide base text or upload files." }]);
      return;
    }
    setGenerating(true);
    try {
      const formData = new FormData();
      formData.set("type", type);
      formData.set("stylePresetId", stylePresetId);
      formData.set("rawText", rawInput);
      formData.set("format", format);
      uploadFiles.forEach((file) => formData.append("files", file));

      const res = await apiFetch("/api/ai/content/generate", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrors(data?.validation?.errors || [{ code: "ai_generate_failed", message: data.error || "AI draft failed." }]);
        return;
      }
      setGeneratedDraft(data.item);
      setAiWarnings(data.warnings || []);
      setWarnings(data.validation?.warnings || []);
      setSuccess("Draft generated.");
    } finally {
      setGenerating(false);
    }
  };

  const handleProjectNotesImport = async () => {
    resetFeedback();
    const res = await apiFetch("/api/content/project-notes/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText: rawInput, status }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setErrors(
        data?.validation?.errors || [{ code: "import_failed", message: data.error || "Import failed." }],
      );
      openPanelsForIssues(data?.validation?.errors || []);
      return;
    }
    if (data.errors?.length) {
      setWarnings(
        data.errors.flatMap((err: { row: number; errors: ValidationIssue[] }) =>
          err.errors.map((issue) => ({
            ...issue,
            message: `Row ${err.row}: ${issue.message}`,
          })),
        ),
      );
    }
    setSuccess(`Imported ${data.createdCount ?? 0} rows.`);
  };

  const requirements = useMemo(() => getRequirements(type), [type]);

  const copyTemplate = async () => {
    await navigator.clipboard.writeText(requirements.templateBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const renderIssues = (items: ValidationIssue[]) =>
    items.map((item, index) => (
      <div key={`${item.code}-${index}`} className="text-sm text-slate-200">
        <div className="font-semibold text-slate-100">{item.message}</div>
        {item.hint ? <div className="text-xs text-slate-400">{item.hint}</div> : null}
      </div>
    ));

  const issuesFor = (field: string) => {
    const fieldErrors = errors.filter((item) => item.field === field);
    const fieldWarnings = warnings.filter((item) => item.field === field);
    return { fieldErrors, fieldWarnings };
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="text-sm font-semibold text-slate-200">Content details</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-300">
            Type
            <select
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              {contentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Status
            <select
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Title (optional)
            <input
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="text-sm text-slate-300">
            Summary (optional)
            <input
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </label>
          <label className="text-sm text-slate-300">
            Topics (comma-separated)
            <input
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              value={topics}
              onChange={(event) => setTopics(event.target.value)}
            />
          </label>
          <label className="text-sm text-slate-300">
            Related slugs (comma-separated)
            <input
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              value={relatedSlugs}
              onChange={(event) => setRelatedSlugs(event.target.value)}
            />
          </label>
          <label className="text-sm text-slate-300">
            Cadence target
            <select
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              value={cadenceTarget}
              onChange={(event) => setCadenceTarget(event.target.value)}
            >
              {cadenceOptions.map((option) => (
                <option key={option} value={option}>
                  {option || "None"}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

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
            onClick={handleGenerateDraft}
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
                <Link
                  href={`/content/${generatedDraft.id}`}
                  className="text-xs text-emerald-200 underline"
                >
                  Open draft for editing
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <details
        id="requirements"
        open={requirementsOpen}
        onToggle={(event) => setRequirementsOpen((event.target as HTMLDetailsElement).open)}
        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
      >
        <summary className="cursor-pointer text-sm font-semibold text-slate-200">Requirements</summary>
        <p className="mt-2 text-sm text-slate-400">
          Save anytime. Assembly will store drafts even if they’re rough. When you mark something READY, it checks for the
          stricter shape.
        </p>
        <div className="mt-3 text-sm text-slate-300">{requirements.purposeLine}</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm text-slate-300">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">To save (Draft)</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {requirements.draftRequirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">To mark READY</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {requirements.readyRequirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
          <span>{requirements.templateLabel}</span>
          <button
            onClick={copyTemplate}
            className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300"
          >
            {copied ? "Copied" : "Copy template"}
          </button>
        </div>
        <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
          {requirements.templateBody}
        </pre>
        {requirements.templateHint ? (
          <div className="mt-2 text-xs text-slate-400">{requirements.templateHint}</div>
        ) : null}
        <div className="mt-4 text-xs text-slate-500">{requirements.footerNote}</div>
      </details>

      {(type === "FIELD_NOTE" || type === "SYSTEMS_MEMO" || type === "BLOG_FEATURE" || type === "PROJECT_NOTE") && (
        <details
          open={pasteOpen}
          onToggle={(event) => setPasteOpen((event.target as HTMLDetailsElement).open)}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
        >
          <summary className="cursor-pointer text-sm font-semibold text-slate-200">
            Paste input / templates
          </summary>
          {type === "SYSTEMS_MEMO" && (
            <div className="mt-3 flex gap-2 text-xs text-slate-400">
              <button
                onClick={() => setFormat("md")}
                className={`rounded-full border px-3 py-1 ${format === "md" ? "border-emerald-500 text-emerald-200" : "border-slate-800 text-slate-400"}`}
              >
                Markdown
              </button>
              <button
                onClick={() => setFormat("json")}
                className={`rounded-full border px-3 py-1 ${format === "json" ? "border-emerald-500 text-emerald-200" : "border-slate-800 text-slate-400"}`}
              >
                JSON
              </button>
            </div>
          )}
          <textarea
            className="mt-4 min-h-[160px] w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            placeholder={
              type === "FIELD_NOTE"
                ? "- Bullet 1\n- Bullet 2\n- Bullet 3"
                : type === "BLOG_FEATURE"
                  ? "---\ntitle: Example\nprimary_keyword: assembly ops\nrelated_keywords: [ops, ai]\ninternal_links:\n  - /posts\nsource_links:\n  - https://example.com\n---\nBody..."
                  : type === "PROJECT_NOTE"
                    ? "case_study_slug,date,metric,detail,source_link\nmmh-seating,2025-12-01,Reservations up 12%,Seat flow improvements,https://example.com"
                    : "Thesis:\nPoints:\n- Point 1\nExample:\nTakeaway:"
            }
            value={rawInput}
            onChange={(event) => setRawInput(event.target.value)}
          />
          {(() => {
            const { fieldErrors, fieldWarnings } = issuesFor("rawInput");
            return fieldErrors.length || fieldWarnings.length ? (
              <div className="mt-3 space-y-2 text-xs">
                {fieldErrors.map((issue, index) => (
                  <div key={`${issue.code}-${index}`} className="text-rose-200">
                    {issue.message} {issue.hint ? `(${issue.hint})` : ""}
                  </div>
                ))}
                {fieldWarnings.map((issue, index) => (
                  <div key={`${issue.code}-${index}`} className="text-amber-200">
                    {issue.message} {issue.hint ? `(${issue.hint})` : ""}
                  </div>
                ))}
              </div>
            ) : null;
          })()}
          {type === "PROJECT_NOTE" ? (
            <div className="mt-3 text-sm text-slate-400">
              Use CSV above for bulk import, or add a single row below.
            </div>
          ) : null}
        </details>
      )}

      {type === "PROJECT_NOTE" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="text-sm font-semibold text-slate-200">Project Note row</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              { key: "caseStudySlug", label: "Case study slug" },
              { key: "date", label: "Date (YYYY-MM-DD)" },
              { key: "metric", label: "Metric" },
              { key: "detail", label: "Detail" },
              { key: "sourceLink", label: "Source link (optional)" },
            ].map((field) => (
              <label key={field.key} className="text-sm text-slate-300">
                {field.label}
                <input
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  value={(projectNoteRow as Record<string, string>)[field.key]}
                  onChange={(event) =>
                    setProjectNoteRow((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
              onClick={handleCreate}
            >
              Add row
            </button>
            <button
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
              onClick={handleProjectNotesImport}
            >
              Import CSV
            </button>
          </div>
          {(() => {
            const { fieldErrors, fieldWarnings } = issuesFor("project_note");
            return fieldErrors.length || fieldWarnings.length ? (
              <div className="mt-3 space-y-2 text-xs">
                {fieldErrors.map((issue, index) => (
                  <div key={`${issue.code}-${index}`} className="text-rose-200">
                    {issue.message} {issue.hint ? `(${issue.hint})` : ""}
                  </div>
                ))}
                {fieldWarnings.map((issue, index) => (
                  <div key={`${issue.code}-${index}`} className="text-amber-200">
                    {issue.message} {issue.hint ? `(${issue.hint})` : ""}
                  </div>
                ))}
              </div>
            ) : null;
          })()}
        </div>
      )}

      {type === "CHANGE_LOG" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="text-sm font-semibold text-slate-200">Change Log entry</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-300">
              Date
              <input
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                value={changeLog.date}
                onChange={(event) => setChangeLog({ ...changeLog, date: event.target.value })}
              />
            </label>
            <label className="text-sm text-slate-300">
              Change
              <input
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                value={changeLog.change}
                onChange={(event) => setChangeLog({ ...changeLog, change: event.target.value })}
              />
            </label>
            <label className="text-sm text-slate-300 md:col-span-2">
              Impact
              <input
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                value={changeLog.impact}
                onChange={(event) => setChangeLog({ ...changeLog, impact: event.target.value })}
              />
            </label>
          </div>
          {(() => {
            const { fieldErrors, fieldWarnings } = issuesFor("change_log");
            return fieldErrors.length || fieldWarnings.length ? (
              <div className="mt-3 space-y-2 text-xs">
                {fieldErrors.map((issue, index) => (
                  <div key={`${issue.code}-${index}`} className="text-rose-200">
                    {issue.message} {issue.hint ? `(${issue.hint})` : ""}
                  </div>
                ))}
                {fieldWarnings.map((issue, index) => (
                  <div key={`${issue.code}-${index}`} className="text-amber-200">
                    {issue.message} {issue.hint ? `(${issue.hint})` : ""}
                  </div>
                ))}
              </div>
            ) : null;
          })()}
        </div>
      )}

      {type === "DECISION_RECORD" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="text-sm font-semibold text-slate-200">Decision record</div>
          <div className="mt-4 grid gap-4">
            {[
              { key: "context", label: "Context" },
              { key: "decision", label: "Decision" },
              { key: "tradeoffs", label: "Tradeoffs" },
              { key: "outcome", label: "Outcome" },
            ].map((field) => (
              <label key={field.key} className="text-sm text-slate-300">
                {field.label}
                <textarea
                  className="mt-2 min-h-[80px] w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  value={(decision as Record<string, string>)[field.key]}
                  onChange={(event) =>
                    setDecision((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          {(() => {
            const { fieldErrors, fieldWarnings } = issuesFor("decision_record");
            return fieldErrors.length || fieldWarnings.length ? (
              <div className="mt-3 space-y-2 text-xs">
                {fieldErrors.map((issue, index) => (
                  <div key={`${issue.code}-${index}`} className="text-rose-200">
                    {issue.message} {issue.hint ? `(${issue.hint})` : ""}
                  </div>
                ))}
                {fieldWarnings.map((issue, index) => (
                  <div key={`${issue.code}-${index}`} className="text-amber-200">
                    {issue.message} {issue.hint ? `(${issue.hint})` : ""}
                  </div>
                ))}
              </div>
            ) : null;
          })()}
        </div>
      )}

      {type === "SIGNAL_LOG" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="text-sm font-semibold text-slate-200">Signal log entry</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-300">
              Date
              <input
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                value={signal.date}
                onChange={(event) => setSignal({ ...signal, date: event.target.value })}
              />
            </label>
            <label className="text-sm text-slate-300">
              Tags (comma-separated)
              <input
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                value={signal.tags}
                onChange={(event) => setSignal({ ...signal, tags: event.target.value })}
              />
            </label>
            <label className="text-sm text-slate-300 md:col-span-2">
              Signal
              <textarea
                className="mt-2 min-h-[80px] w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                value={signal.signal}
                onChange={(event) => setSignal({ ...signal, signal: event.target.value })}
              />
            </label>
            <label className="text-sm text-slate-300 md:col-span-2">
              Link (optional)
              <input
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                value={signal.link}
                onChange={(event) => setSignal({ ...signal, link: event.target.value })}
              />
            </label>
          </div>
          {(() => {
            const { fieldErrors, fieldWarnings } = issuesFor("signal_log");
            return fieldErrors.length || fieldWarnings.length ? (
              <div className="mt-3 space-y-2 text-xs">
                {fieldErrors.map((issue, index) => (
                  <div key={`${issue.code}-${index}`} className="text-rose-200">
                    {issue.message} {issue.hint ? `(${issue.hint})` : ""}
                  </div>
                ))}
                {fieldWarnings.map((issue, index) => (
                  <div key={`${issue.code}-${index}`} className="text-amber-200">
                    {issue.message} {issue.hint ? `(${issue.hint})` : ""}
                  </div>
                ))}
              </div>
            ) : null;
          })()}
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="text-sm font-semibold text-slate-200">Upload attachment</div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="file"
            className="text-sm text-slate-300"
            multiple
            onChange={(event) => setUploadFiles(Array.from(event.target.files ?? []))}
          />
          <button
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
            onClick={handleUpload}
          >
            Upload file
          </button>
        </div>
        {uploadFiles.length ? (
          <div className="mt-2 text-xs text-slate-400">
            Selected: {uploadFiles.map((file) => file.name).join(", ")}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400"
          onClick={handleCreate}
        >
          Save draft (manual)
        </button>
      </div>

      {errors.length > 0 ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4">
          <div className="text-xs uppercase tracking-wide text-rose-200">Errors</div>
          {!requirementsOpen && (status === "READY" || status === "APPROVED") ? (
            <button
              onClick={() => setRequirementsOpen(true)}
              className="mt-2 rounded-full border border-rose-300/40 px-3 py-1 text-xs text-rose-100"
            >
              View requirements
            </button>
          ) : null}
          <div className="mt-2 space-y-2">{renderIssues(errors)}</div>
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4">
          <div className="text-xs uppercase tracking-wide text-amber-200">Warnings</div>
          <div className="mt-2 space-y-2">{renderIssues(warnings)}</div>
        </div>
      ) : null}
      {aiWarnings.length > 0 ? (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4">
          <div className="text-xs uppercase tracking-wide text-amber-200">AI warnings</div>
          <div className="mt-2 space-y-2 text-xs text-amber-200">
            {aiWarnings.map((warning) => (
              <div key={warning}>{warning}</div>
            ))}
          </div>
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          {success}
        </div>
      ) : null}
    </div>
  );
}
