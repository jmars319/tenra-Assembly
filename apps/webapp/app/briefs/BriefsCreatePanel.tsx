import type { Project, RepoAccess } from "@/lib/store/types";

type StyleOption = {
  id: string;
  name: string;
  description?: string | null;
  source: "preset" | "workspace";
};

type ScopeMode = "AUTO" | "FULL" | "DAYS" | "COMMITS";

// Brief creation surface
export function BriefsCreatePanel({
  aiConfigured,
  commitWindowPage,
  commitWindowSize,
  days,
  error,
  evidenceBundleId,
  generalFiles,
  generalPrompt,
  generalSuggestError,
  generalSuggestState,
  includeContent,
  projectId,
  projects,
  repoId,
  repos,
  scopeMode,
  setCommitWindowPage,
  setCommitWindowSize,
  setDays,
  setGeneralFiles,
  setGeneralPrompt,
  setIncludeContent,
  setProjectId,
  setRepoId,
  setScopeMode,
  setSourceRepoId,
  setStylePresetId,
  setSummary,
  setUseCommits,
  setUseDocs,
  setUsePulls,
  setUseReleases,
  sourceRepoId,
  state,
  styleOptions,
  stylePresetId,
  submit,
  suggestBrief,
  suggestError,
  suggestGeneralBrief,
  suggestState,
  summary,
  useCommits,
  useDocs,
  usePulls,
  useReleases,
}: {
  aiConfigured: boolean | null;
  commitWindowPage: string;
  commitWindowSize: string;
  days: string;
  error: string | null;
  evidenceBundleId: string | undefined;
  generalFiles: File[];
  generalPrompt: string;
  generalSuggestError: string | null;
  generalSuggestState: "idle" | "loading" | "error";
  includeContent: boolean;
  projectId: string;
  projects: Project[];
  repoId: string;
  repos: RepoAccess[];
  scopeMode: ScopeMode;
  setCommitWindowPage: (value: string) => void;
  setCommitWindowSize: (value: string) => void;
  setDays: (value: string) => void;
  setGeneralFiles: (files: File[]) => void;
  setGeneralPrompt: (value: string) => void;
  setIncludeContent: (value: boolean) => void;
  setProjectId: (value: string) => void;
  setRepoId: (value: string) => void;
  setScopeMode: (value: ScopeMode) => void;
  setSourceRepoId: (value: string) => void;
  setStylePresetId: (value: string) => void;
  setSummary: (value: string) => void;
  setUseCommits: (value: boolean) => void;
  setUseDocs: (value: boolean) => void;
  setUsePulls: (value: boolean) => void;
  setUseReleases: (value: boolean) => void;
  sourceRepoId: string;
  state: "idle" | "saving" | "error";
  styleOptions: StyleOption[];
  stylePresetId: string;
  submit: () => Promise<void>;
  suggestBrief: () => Promise<void>;
  suggestError: string | null;
  suggestGeneralBrief: () => Promise<void>;
  suggestState: "idle" | "loading" | "error";
  summary: string;
  useCommits: boolean;
  useDocs: boolean;
  usePulls: boolean;
  useReleases: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      {/* Manual brief boundary */}
      <div className="text-sm font-semibold text-slate-200">Create brief</div>
      <div className="mt-4 grid gap-4 md:grid-cols-[0.45fr_1fr]">
        <div className="grid gap-4">
          <label className="grid gap-2 text-xs text-slate-400">
            Project
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-xs text-slate-400">
            Source repo (optional)
            <select
              value={sourceRepoId}
              onChange={(event) => setSourceRepoId(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100"
            >
              <option value="">General (no repo)</option>
              {repos.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.repo} ({repo.projectTag})
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="grid gap-2 text-xs text-slate-400">
          Summary
          <textarea
            rows={6}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            placeholder="What changed, why it matters, constraints, and key notes for review."
          />
        </label>
      </div>
      {/* Evidence capture boundary */}
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500">Suggest from repo</div>
        <label className="mt-3 grid gap-2 text-xs text-slate-400">
          Style preset
          <select
            value={stylePresetId}
            onChange={(event) => setStylePresetId(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100"
          >
            {styleOptions.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
                {preset.description ? ` — ${preset.description}` : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-xs text-slate-400">
            Repo
            <select
              value={repoId}
              onChange={(event) => setRepoId(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100"
            >
              {repos.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.repo} ({repo.projectTag})
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-xs text-slate-400">
            Scope
            <select
              value={scopeMode}
              onChange={(event) => setScopeMode(event.target.value as ScopeMode)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100"
            >
              <option value="AUTO">Auto (full once, then recent)</option>
              <option value="FULL">Full history</option>
              <option value="DAYS">Recent days</option>
              <option value="COMMITS">Commit chunks</option>
            </select>
          </label>
          {scopeMode === "DAYS" ? (
            <label className="grid gap-2 text-xs text-slate-400">
              Days
              <input
                value={days}
                onChange={(event) => setDays(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          ) : null}
          {scopeMode === "COMMITS" ? (
            <>
              <label className="grid gap-2 text-xs text-slate-400">
                Commits per chunk
                <input
                  value={commitWindowSize}
                  onChange={(event) => setCommitWindowSize(event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="grid gap-2 text-xs text-slate-400">
                Chunk index (0 = oldest)
                <input
                  value={commitWindowPage}
                  onChange={(event) => setCommitWindowPage(event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </label>
            </>
          ) : null}
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={includeContent}
              onChange={(event) => setIncludeContent(event.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900"
            />
            Include diff content where available
          </label>
        </div>
        <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
          {[
            ["Docs (README, docs/, CHANGELOG)", useDocs, setUseDocs],
            ["Commits", useCommits, setUseCommits],
            ["Pull requests", usePulls, setUsePulls],
            ["Releases", useReleases, setUseReleases],
          ].map(([label, checked, setter]) => (
            <label key={label as string} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checked as boolean}
                onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-900"
              />
              {label as string}
            </label>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => void suggestBrief()}
            disabled={aiConfigured === false || suggestState === "loading"}
            className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-200"
          >
            {suggestState === "loading" ? "Generating..." : "Suggest brief"}
          </button>
          {suggestState === "loading" ? <div className="text-xs text-slate-500">Working...</div> : null}
          {suggestError ? <div className="text-xs text-rose-300">{suggestError}</div> : null}
          {aiConfigured === false ? (
            <div className="text-xs text-slate-500">AI Assist is not configured.</div>
          ) : null}
        </div>
        {evidenceBundleId ? (
          <div className="mt-2 text-xs text-slate-500">Evidence bundle: {evidenceBundleId}</div>
        ) : null}
      </div>
      {/* General prompt boundary */}
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500">Suggest from text</div>
        <label className="mt-3 grid gap-2 text-xs text-slate-400">
          Prompt
          <textarea
            rows={3}
            value={generalPrompt}
            onChange={(event) => setGeneralPrompt(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            placeholder="e.g. Brief about the three most important things I have learned in the last month."
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <input
            type="file"
            multiple
            onChange={(event) => setGeneralFiles(Array.from(event.target.files ?? []))}
            className="text-xs text-slate-300"
          />
          {generalFiles.length ? (
            <span className="text-xs text-slate-500">
              Files: {generalFiles.map((file) => file.name).join(", ")}
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => void suggestGeneralBrief()}
            disabled={aiConfigured === false || generalSuggestState === "loading"}
            className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-200"
          >
            {generalSuggestState === "loading" ? "Generating..." : "Suggest general brief"}
          </button>
          {generalSuggestState === "loading" ? <div className="text-xs text-slate-500">Working...</div> : null}
          {generalSuggestError ? <div className="text-xs text-rose-300">{generalSuggestError}</div> : null}
          {aiConfigured === false ? (
            <div className="text-xs text-slate-500">AI Assist is not configured.</div>
          ) : null}
        </div>
      </div>
      {/* Brief save boundary */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => void submit()}
          className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
        >
          {state === "saving" ? "Saving..." : "Create brief"}
        </button>
        {error ? <div className="text-xs text-rose-300">{error}</div> : null}
      </div>
    </div>
  );
}
