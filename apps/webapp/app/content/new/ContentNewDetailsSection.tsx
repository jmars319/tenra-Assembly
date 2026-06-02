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

export function ContentNewDetailsSection({
  cadenceTarget,
  relatedSlugs,
  setCadenceTarget,
  setRelatedSlugs,
  setStatus,
  setSummary,
  setTitle,
  setTopics,
  setType,
  status,
  summary,
  title,
  topics,
  type,
}: {
  cadenceTarget: string;
  relatedSlugs: string;
  setCadenceTarget: (value: string) => void;
  setRelatedSlugs: (value: string) => void;
  setStatus: (value: string) => void;
  setSummary: (value: string) => void;
  setTitle: (value: string) => void;
  setTopics: (value: string) => void;
  setType: (value: string) => void;
  status: string;
  summary: string;
  title: string;
  topics: string;
  type: string;
}) {
  return (
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
  );
}
