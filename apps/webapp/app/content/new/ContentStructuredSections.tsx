import { ContentFieldIssues } from "./ContentFieldIssues";
import type { FieldIssues } from "./ContentNewTypes";

type ProjectNoteRow = {
  caseStudySlug: string;
  date: string;
  detail: string;
  metric: string;
  sourceLink: string;
};

type ChangeLogEntry = {
  date: string;
  change: string;
  impact: string;
};

type DecisionEntry = {
  context: string;
  decision: string;
  tradeoffs: string;
  outcome: string;
};

type SignalEntry = {
  date: string;
  signal: string;
  tags: string;
  link: string;
};

export function ContentStructuredSections({
  changeLog,
  decision,
  handleCreate,
  handleProjectNotesImport,
  issuesFor,
  projectNoteRow,
  setChangeLog,
  setDecision,
  setProjectNoteRow,
  setSignal,
  signal,
  type,
}: {
  changeLog: ChangeLogEntry;
  decision: DecisionEntry;
  handleCreate: () => Promise<void>;
  handleProjectNotesImport: () => Promise<void>;
  issuesFor: (field: string) => FieldIssues;
  projectNoteRow: ProjectNoteRow;
  setChangeLog: (value: ChangeLogEntry) => void;
  setDecision: (apply: (value: DecisionEntry) => DecisionEntry) => void;
  setProjectNoteRow: (apply: (value: ProjectNoteRow) => ProjectNoteRow) => void;
  setSignal: (value: SignalEntry) => void;
  signal: SignalEntry;
  type: string;
}) {
  return (
    <>
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
              onClick={() => void handleCreate()}
            >
              Add row
            </button>
            <button
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
              onClick={() => void handleProjectNotesImport()}
            >
              Import CSV
            </button>
          </div>
          <ContentFieldIssues {...issuesFor("project_note")} />
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
          <ContentFieldIssues {...issuesFor("change_log")} />
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
          <ContentFieldIssues {...issuesFor("decision_record")} />
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
          <ContentFieldIssues {...issuesFor("signal_log")} />
        </div>
      )}
    </>
  );
}
