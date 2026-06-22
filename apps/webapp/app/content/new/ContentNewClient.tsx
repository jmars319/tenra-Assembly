"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ValidationIssue } from "@/lib/content/types";
import { getRequirements } from "@/lib/content/requirementsCopy";
import { stylePresets } from "@/lib/content/stylePresets";

import { ContentFeedbackPanels } from "./ContentFeedbackPanels";
import { ContentFieldIssues } from "./ContentFieldIssues";
import { ContentNewDetailsSection } from "./ContentNewDetailsSection";
import { ContentNewDraftPanel } from "./ContentNewDraftPanel";
import { ContentStructuredSections } from "./ContentStructuredSections";
import type { GeneratedDraft, StyleOption } from "./ContentNewTypes";

// Content creation state boundary
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

  // Feedback routing boundary
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

  // Workspace style boundary
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
        // Style presets are optional; the form defaults must remain usable without workspace data.
      }
    };
    void loadStyles();
  }, [apiFetch]);

  // Draft persistence boundary
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

  // AI draft boundary
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
  // Project note import boundary
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

  const issuesFor = (field: string) => {
    const fieldErrors = errors.filter((item) => item.field === field);
    const fieldWarnings = warnings.filter((item) => item.field === field);
    return { fieldErrors, fieldWarnings };
  };

  // Content form boundary
  return (
    <div className="flex flex-col gap-6">
      <ContentNewDetailsSection
        cadenceTarget={cadenceTarget}
        relatedSlugs={relatedSlugs}
        setCadenceTarget={setCadenceTarget}
        setRelatedSlugs={setRelatedSlugs}
        setStatus={setStatus}
        setSummary={setSummary}
        setTitle={setTitle}
        setTopics={setTopics}
        setType={setType}
        status={status}
        summary={summary}
        title={title}
        topics={topics}
        type={type}
      />

      <ContentNewDraftPanel
        aiAvailable={aiAvailable}
        aiStatus={aiStatus}
        generatedDraft={generatedDraft}
        generating={generating}
        handleGenerateDraft={handleGenerateDraft}
        rawInput={rawInput}
        setRawInput={setRawInput}
        setStylePresetId={setStylePresetId}
        setUploadFiles={setUploadFiles}
        styleOptions={styleOptions}
        stylePresetId={stylePresetId}
        uploadFiles={uploadFiles}
      />

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
          <ContentFieldIssues {...issuesFor("rawInput")} />
          {type === "PROJECT_NOTE" ? (
            <div className="mt-3 text-sm text-slate-400">
              Use CSV above for bulk import, or add a single row below.
            </div>
          ) : null}
        </details>
      )}

      <ContentStructuredSections
        changeLog={changeLog}
        decision={decision}
        handleCreate={handleCreate}
        handleProjectNotesImport={handleProjectNotesImport}
        issuesFor={issuesFor}
        projectNoteRow={projectNoteRow}
        setChangeLog={setChangeLog}
        setDecision={setDecision}
        setProjectNoteRow={setProjectNoteRow}
        setSignal={setSignal}
        signal={signal}
        type={type}
      />

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

      <ContentFeedbackPanels
        aiWarnings={aiWarnings}
        errors={errors}
        requirementsOpen={requirementsOpen}
        setRequirementsOpen={setRequirementsOpen}
        status={status}
        success={success}
        warnings={warnings}
      />
    </div>
  );
}
