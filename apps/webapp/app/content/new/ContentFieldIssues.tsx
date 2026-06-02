import type { FieldIssues } from "./ContentNewTypes";

export function ContentFieldIssues({ fieldErrors, fieldWarnings }: FieldIssues) {
  if (!fieldErrors.length && !fieldWarnings.length) {
    return null;
  }

  return (
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
  );
}
