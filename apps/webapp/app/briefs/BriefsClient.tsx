"use client";

import { useEffect, useState } from "react";
import type { Brief, Project, RepoAccess } from "@/lib/store/types";
import { stylePresets } from "@/lib/content/stylePresets";

import { BriefsCreatePanel } from "./BriefsCreatePanel";
import { BriefsListPanel } from "./BriefsListPanel";

type Props = {
  briefs: Brief[];
  projects: Project[];
  repos: RepoAccess[];
};

export default function BriefsClient({ briefs, projects, repos }: Props) {
  const [items, setItems] = useState<Brief[]>(briefs);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [summary, setSummary] = useState("");
  const [sourceRepoId, setSourceRepoId] = useState<string>("");
  const [generalPrompt, setGeneralPrompt] = useState("");
  const [generalFiles, setGeneralFiles] = useState<File[]>([]);
  const [repoId, setRepoId] = useState(repos[0]?.id ?? "");
  const [stylePresetId, setStylePresetId] = useState(stylePresets[0]?.id ?? "neutral-brief");
  const [styleOptions, setStyleOptions] = useState(
    stylePresets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      source: "preset" as const,
    })),
  );
  const [scopeMode, setScopeMode] = useState<"AUTO" | "FULL" | "DAYS" | "COMMITS">("AUTO");
  const [days, setDays] = useState("30");
  const [commitWindowSize, setCommitWindowSize] = useState("50");
  const [commitWindowPage, setCommitWindowPage] = useState("0");
  const [includeContent, setIncludeContent] = useState(false);
  const [useDocs, setUseDocs] = useState(true);
  const [useCommits, setUseCommits] = useState(true);
  const [usePulls, setUsePulls] = useState(true);
  const [useReleases, setUseReleases] = useState(true);
  const [evidenceBundleId, setEvidenceBundleId] = useState<string | undefined>(undefined);
  const [suggestState, setSuggestState] = useState<"idle" | "loading" | "error">("idle");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [generalSuggestState, setGeneralSuggestState] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [generalSuggestError, setGeneralSuggestError] = useState<string | null>(null);
  const [filterScope, setFilterScope] = useState<"all" | "general" | "repo">("all");
  const [filterRepo, setFilterRepo] = useState<string>("all");
  const [activeSummary, setActiveSummary] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await fetch("/api/ai/status");
        const data = await res.json();
        setAiConfigured(Boolean(data?.configured));
      } catch {
        setAiConfigured(false);
      }
    };
    void loadStatus();
  }, []);

  useEffect(() => {
    const loadStyles = async () => {
      try {
        const [stylesRes, prefRes] = await Promise.all([
          fetch("/api/workspaces/styles"),
          fetch("/api/workspaces/style-preference"),
        ]);
        if (stylesRes.ok) {
          const data = await stylesRes.json();
          const workspaceStyles = Array.isArray(data?.styles)
            ? data.styles.map((style: { id: string; name: string; description?: string | null; instructions?: Record<string, unknown> }) => ({
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
  }, []);

  const submit = async () => {
    setState("saving");
    setError(null);
    if (!projectId) {
      setState("error");
      setError("Select a project.");
      return;
    }
    if (!summary.trim()) {
      setState("error");
      setError("Brief summary is required.");
      return;
    }

    const res = await fetch("/api/briefs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        summary,
        evidenceBundleId,
        sourceRepoId: sourceRepoId || undefined,
      }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setState("error");
      setError(payload.error ?? "Failed to create brief.");
      return;
    }

    const created = (await res.json()) as Brief;
    setItems((prev) => [created, ...prev]);
    setSummary("");
    setSourceRepoId("");
    setEvidenceBundleId(undefined);
    setState("idle");
  };

  const removeBrief = async (id: string) => {
    setError(null);
    const confirmDelete = window.confirm("Delete this brief? This cannot be undone.");
    if (!confirmDelete) return;
    const res = await fetch(`/api/briefs/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? "Failed to delete brief.");
      return;
    }

    setItems((prev) => prev.filter((brief) => brief.id !== id));
  };

  const suggestBrief = async () => {
    setSuggestState("loading");
    setSuggestError(null);
    if (!repoId) {
      setSuggestState("error");
      setSuggestError("Select a repo.");
      return;
    }
    if (aiConfigured === false) {
      setSuggestState("error");
      setSuggestError("AI Assist is not configured.");
      return;
    }
    if (!useDocs && !useCommits && !usePulls && !useReleases) {
      setSuggestState("error");
      setSuggestError("Select at least one evidence source.");
      return;
    }

    const captureRes = await fetch("/api/evidence/capture", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repoId,
        scope: scopeMode,
        days: Number(days),
        commitWindowSize: Number(commitWindowSize),
        commitWindowPage: Number(commitWindowPage),
        sources: {
          docs: useDocs,
          commits: useCommits,
          pulls: usePulls,
          releases: useReleases,
        },
        includeContent,
      }),
    });

    if (!captureRes.ok) {
      const payload = await captureRes.json().catch(() => ({}));
      setSuggestState("error");
      setSuggestError(payload.error ?? "Failed to capture evidence.");
      return;
    }

    const capturePayload = await captureRes.json();
    const bundleId = capturePayload.bundleId as string;
    setEvidenceBundleId(bundleId);
    setSourceRepoId(repoId);

    const suggestRes = await fetch("/api/ai/brief-suggest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bundleId,
        stylePresetId,
      }),
    });

    if (!suggestRes.ok) {
      const payload = await suggestRes.json().catch(() => ({}));
      setSuggestState("error");
      setSuggestError(payload.error ?? "Failed to suggest brief.");
      return;
    }

    const payload = await suggestRes.json();
    setSummary(payload.summary ?? "");
    setSuggestState("idle");
  };

  const suggestGeneralBrief = async () => {
    setGeneralSuggestState("loading");
    setGeneralSuggestError(null);
    if (!generalPrompt.trim() && generalFiles.length === 0) {
      setGeneralSuggestState("error");
      setGeneralSuggestError("Enter a brief prompt or upload files.");
      return;
    }
    if (aiConfigured === false) {
      setGeneralSuggestState("error");
      setGeneralSuggestError("AI Assist is not configured.");
      return;
    }

    const formData = new FormData();
    formData.set("promptText", generalPrompt.trim());
    formData.set("stylePresetId", stylePresetId);
    generalFiles.forEach((file) => formData.append("files", file));

    const suggestRes = await fetch("/api/ai/brief-draft", {
      method: "POST",
      body: formData,
    });

    if (!suggestRes.ok) {
      const payload = await suggestRes.json().catch(() => ({}));
      setGeneralSuggestState("error");
      setGeneralSuggestError(payload.error ?? "Failed to suggest brief.");
      return;
    }

    const payload = await suggestRes.json();
    setSummary(payload.summary ?? "");
    setEvidenceBundleId(undefined);
    setSourceRepoId("");
    setGeneralSuggestState("idle");
  };

  const filteredBriefs = items.filter((brief) => {
    const isRepoSpecific = Boolean(brief.sourceRepoId || brief.evidenceBundleId);
    if (filterScope === "general" && isRepoSpecific) return false;
    if (filterScope === "repo" && !isRepoSpecific) return false;
    if (filterRepo !== "all" && brief.sourceRepoId !== filterRepo) return false;
    return true;
  });

  const withParams = (href: string) => href;

  return (
    <div className="grid gap-6">
      <BriefsCreatePanel
        aiConfigured={aiConfigured}
        commitWindowPage={commitWindowPage}
        commitWindowSize={commitWindowSize}
        days={days}
        error={error}
        evidenceBundleId={evidenceBundleId}
        generalFiles={generalFiles}
        generalPrompt={generalPrompt}
        generalSuggestError={generalSuggestError}
        generalSuggestState={generalSuggestState}
        includeContent={includeContent}
        projectId={projectId}
        projects={projects}
        repoId={repoId}
        repos={repos}
        scopeMode={scopeMode}
        setCommitWindowPage={setCommitWindowPage}
        setCommitWindowSize={setCommitWindowSize}
        setDays={setDays}
        setGeneralFiles={setGeneralFiles}
        setGeneralPrompt={setGeneralPrompt}
        setIncludeContent={setIncludeContent}
        setProjectId={setProjectId}
        setRepoId={setRepoId}
        setScopeMode={setScopeMode}
        setSourceRepoId={setSourceRepoId}
        setStylePresetId={setStylePresetId}
        setSummary={setSummary}
        setUseCommits={setUseCommits}
        setUseDocs={setUseDocs}
        setUsePulls={setUsePulls}
        setUseReleases={setUseReleases}
        sourceRepoId={sourceRepoId}
        state={state}
        styleOptions={styleOptions}
        stylePresetId={stylePresetId}
        submit={submit}
        suggestBrief={suggestBrief}
        suggestError={suggestError}
        suggestGeneralBrief={suggestGeneralBrief}
        suggestState={suggestState}
        summary={summary}
        useCommits={useCommits}
        useDocs={useDocs}
        usePulls={usePulls}
        useReleases={useReleases}
      />
      <BriefsListPanel
        activeSummary={activeSummary}
        filterRepo={filterRepo}
        filterScope={filterScope}
        filteredBriefs={filteredBriefs}
        projects={projects}
        removeBrief={removeBrief}
        repos={repos}
        setActiveSummary={setActiveSummary}
        setFilterRepo={setFilterRepo}
        setFilterScope={setFilterScope}
        withParams={withParams}
      />
    </div>
  );
}
