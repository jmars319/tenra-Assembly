import type { ValidationIssue } from "@/lib/content/types";

const renderIssues = (items: ValidationIssue[]) =>
  items.map((item, index) => (
    <div key={`${item.code}-${index}`} className="text-sm text-slate-200">
      <div className="font-semibold text-slate-100">{item.message}</div>
      {item.hint ? <div className="text-xs text-slate-400">{item.hint}</div> : null}
    </div>
  ));

export function ContentFeedbackPanels({
  aiWarnings,
  errors,
  requirementsOpen,
  setRequirementsOpen,
  status,
  success,
  warnings,
}: {
  aiWarnings: string[];
  errors: ValidationIssue[];
  requirementsOpen: boolean;
  setRequirementsOpen: (value: boolean) => void;
  status: string;
  success: string | null;
  warnings: ValidationIssue[];
}) {
  return (
    <>
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
    </>
  );
}
