import type {
  BlogFeature,
  ChangeLogEntry,
  ContentType,
  DecisionRecord,
  ProjectNoteRow,
  SignalLogEntry,
  SystemsMemo,
  ValidationIssue,
  ValidationSummary,
} from "@assembly/shared-types/content";
import {
  normalizeBulletText,
  parseBullets,
  parseFrontmatterLoose,
  parseProjectNoteRows,
  parseSystemsMemoMarkdown,
} from "./parsers";

const issue = (code: string, message: string, hint?: string, field?: string): ValidationIssue => ({
  code,
  message,
  hint,
  field,
});

export const validateFieldNotesCreate = (input: string): ValidationSummary<{ bullets: string[] }> => {
  const normalizedText = normalizeBulletText(input);
  const bullets = parseBullets(normalizedText);
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!input.trim()) {
    errors.push(issue("field_notes_empty", "Field Notes require some input.", "Add 1+ bullets.", "rawInput"));
  }

  if (bullets.length === 0) {
    warnings.push(
      issue(
        "field_notes_no_bullets",
        "No bullets detected; content will be auto-split.",
        "Use '-' or '•' bullets for clarity.",
        "rawInput",
      ),
    );
  }

  if (bullets.length > 10) {
    warnings.push(
      issue("field_notes_too_many", "Field Notes should be concise.", "Aim for 1–10 bullets.", "rawInput"),
    );
  }

  return { ok: errors.length === 0, errors, warnings, normalized: { bullets } };
};

export const validateFieldNotesPromote = (input: string): ValidationSummary<{ bullets: string[] }> => {
  const normalizedText = normalizeBulletText(input);
  const bullets = parseBullets(normalizedText);
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (bullets.length < 3 || bullets.length > 8) {
    errors.push(
      issue(
        "field_notes_range",
        "Field Notes require 3–8 bullets for READY/APPROVED.",
        "Trim or add bullets to reach 3–8.",
        "rawInput",
      ),
    );
  }

  return { ok: errors.length === 0, errors, warnings, normalized: { bullets } };
};

export const validateSystemsMemoCreate = (
  input: string,
  format: "json" | "md",
): ValidationSummary<SystemsMemo> => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  let memo: SystemsMemo | null = null;

  try {
    memo = format === "json" ? (JSON.parse(input) as SystemsMemo) : parseSystemsMemoMarkdown(input);
  } catch {
    errors.push(
      issue(
        "systems_memo_parse",
        "Systems Memo input could not be parsed.",
        "Use the Markdown template or valid JSON.",
        "rawInput",
      ),
    );
  }

  if (!input.trim()) {
    errors.push(
      issue("systems_memo_empty", "Systems Memo requires some input.", "Provide a thesis or outline.", "rawInput"),
    );
  } else if (input.trim().length < 200 && !memo?.thesis) {
    warnings.push(
      issue(
        "systems_memo_light",
        "Drafts should include a thesis or at least ~200 characters.",
        "Add a thesis or expand the outline.",
        "rawInput",
      ),
    );
  }

  return { ok: errors.length === 0, errors, warnings, normalized: memo ?? undefined };
};

export const validateSystemsMemoPromote = (
  input: string,
  format: "json" | "md",
): ValidationSummary<SystemsMemo> => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  let memo: SystemsMemo | null = null;

  try {
    memo = format === "json" ? (JSON.parse(input) as SystemsMemo) : parseSystemsMemoMarkdown(input);
  } catch {
    errors.push(
      issue(
        "systems_memo_parse",
        "Systems Memo input could not be parsed.",
        "Use the Markdown template or valid JSON.",
        "rawInput",
      ),
    );
  }

  if (!memo?.thesis)
    errors.push(issue("systems_memo_thesis", "Thesis is required.", "Add a Thesis section.", "rawInput"));
  if (!memo?.takeaway)
    errors.push(issue("systems_memo_takeaway", "Takeaway is required.", "Add a Takeaway section.", "rawInput"));
  if (!memo?.points || memo.points.length < 3) {
    errors.push(
      issue("systems_memo_points", "At least 3 points are required.", "Add 3–5 bullet points.", "rawInput"),
    );
  }

  return { ok: errors.length === 0, errors, warnings, normalized: memo ?? undefined };
};

export const validateBlogFeatureCreate = (input: string): ValidationSummary<BlogFeature> => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  if (!input.trim()) {
    errors.push(
      issue("blog_empty", "Blog Feature requires content.", "Paste markdown with or without frontmatter.", "rawInput"),
    );
    return { ok: false, errors, warnings };
  }

  const parsed = parseFrontmatterLoose(input);
  if (!parsed.title) {
    warnings.push(
      issue("blog_title_missing", "Missing title in frontmatter.", "Add `title:` in frontmatter.", "rawInput"),
    );
  }
  if (!parsed.primary_keyword) {
    warnings.push(
      issue("blog_keyword_missing", "Missing primary keyword.", "Add `primary_keyword:` in frontmatter.", "rawInput"),
    );
  }
  if (!parsed.body || parsed.body.length < 120) {
    warnings.push(
      issue("blog_body_short", "Body is short for a blog draft.", "Aim for a longer draft.", "rawInput"),
    );
  }

  return { ok: errors.length === 0, errors, warnings, normalized: parsed };
};

export const validateBlogFeaturePromote = (input: string): ValidationSummary<BlogFeature> => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const parsed = parseFrontmatterLoose(input);

  if (!parsed.title)
    errors.push(issue("blog_title_required", "title is required.", "Add `title:` in frontmatter.", "rawInput"));
  if (!parsed.primary_keyword)
    errors.push(issue("blog_keyword_required", "primary_keyword is required.", "Add `primary_keyword:`.", "rawInput"));
  if (!parsed.body || parsed.body.length < 300) {
    errors.push(
      issue(
        "blog_body_length",
        "Body must be at least 300 characters for READY/APPROVED.",
        "Expand the draft body.",
        "rawInput",
      ),
    );
  }

  return { ok: errors.length === 0, errors, warnings, normalized: parsed };
};

export const validateProjectNoteRowCreate = (row: ProjectNoteRow): ValidationSummary<ProjectNoteRow> => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  if (!row.caseStudySlug)
    warnings.push(issue("project_note_slug", "Missing case study slug.", "Add case_study_slug.", "project_note"));
  if (!row.date)
    warnings.push(issue("project_note_date", "Missing date.", "Add a YYYY-MM-DD date.", "project_note"));
  if (!row.detail)
    warnings.push(issue("project_note_detail", "Missing detail.", "Describe the delta.", "project_note"));
  return { ok: errors.length === 0, errors, warnings, normalized: row };
};

export const validateProjectNoteRowPromote = (row: ProjectNoteRow): ValidationSummary<ProjectNoteRow> => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  if (!row.caseStudySlug)
    errors.push(
      issue("project_note_slug_required", "case_study_slug is required.", "Add case_study_slug.", "project_note"),
    );
  if (!row.date)
    errors.push(issue("project_note_date_required", "date is required.", "Add a date.", "project_note"));
  if (!row.detail)
    errors.push(issue("project_note_detail_required", "detail is required.", "Add detail.", "project_note"));
  return { ok: errors.length === 0, errors, warnings, normalized: row };
};

export const validateChangeLogCreate = (entry: ChangeLogEntry): ValidationSummary<ChangeLogEntry> => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  if (!entry.date)
    warnings.push(issue("change_log_date", "Missing date.", "Add a YYYY-MM-DD date.", "change_log"));
  if (!entry.change)
    warnings.push(issue("change_log_change", "Missing change text.", "Describe the change.", "change_log"));
  if (!entry.impact)
    warnings.push(issue("change_log_impact", "Missing impact.", "Describe the impact.", "change_log"));
  return { ok: errors.length === 0, errors, warnings, normalized: entry };
};

export const validateChangeLogPromote = (entry: ChangeLogEntry): ValidationSummary<ChangeLogEntry> => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  if (!entry.date)
    errors.push(issue("change_log_date_required", "date is required.", "Add a date.", "change_log"));
  if (!entry.change)
    errors.push(issue("change_log_change_required", "change is required.", "Add change text.", "change_log"));
  if (!entry.impact)
    errors.push(issue("change_log_impact_required", "impact is required.", "Add impact.", "change_log"));
  return { ok: errors.length === 0, errors, warnings, normalized: entry };
};

export const getPromotionIssuesForItem = (input: {
  type: ContentType;
  rawInput?: string | null;
  structured?: unknown;
  format?: "json" | "md";
}): ValidationIssue[] => {
  const rawInput = input.rawInput ?? "";
  const format = input.format ?? "md";

  if (input.type === "FIELD_NOTE") {
    return validateFieldNotesPromote(rawInput).errors;
  }
  if (input.type === "SYSTEMS_MEMO") {
    return validateSystemsMemoPromote(rawInput, format).errors;
  }
  if (input.type === "BLOG_FEATURE") {
    return validateBlogFeaturePromote(rawInput).errors;
  }
  if (input.type === "PROJECT_NOTE") {
    if (!input.structured) {
      return [issue("project_note_missing", "Project Note row missing.", "Fill the Project Note fields.", "project_note")];
    }
    return validateProjectNoteRowPromote(input.structured as ProjectNoteRow).errors;
  }
  if (input.type === "CHANGE_LOG") {
    if (!input.structured) {
      return [issue("change_log_missing", "Change Log entry missing.", "Fill date/change/impact.", "change_log")];
    }
    return validateChangeLogPromote(input.structured as ChangeLogEntry).errors;
  }
  if (input.type === "DECISION_RECORD") {
    if (!input.structured) {
      return [issue("decision_missing", "Decision Record missing.", "Fill context/decision/tradeoffs/outcome.", "decision_record")];
    }
    return validateDecisionPromote(input.structured as DecisionRecord).errors;
  }
  if (input.type === "SIGNAL_LOG") {
    if (!input.structured) {
      return [issue("signal_missing", "Signal Log entry missing.", "Fill date/signal/tags.", "signal_log")];
    }
    return validateSignalPromote(input.structured as SignalLogEntry).errors;
  }
  return [];
};

export const validateDecisionCreate = (entry: DecisionRecord): ValidationSummary<DecisionRecord> => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  if (!entry.context)
    warnings.push(issue("decision_context", "Missing context.", "Describe the situation.", "decision_record"));
  if (!entry.decision)
    warnings.push(issue("decision_decision", "Missing decision.", "Record the decision.", "decision_record"));
  if (!entry.tradeoffs)
    warnings.push(issue("decision_tradeoffs", "Missing tradeoffs.", "List tradeoffs.", "decision_record"));
  if (!entry.outcome)
    warnings.push(issue("decision_outcome", "Missing outcome.", "Note the outcome.", "decision_record"));
  return { ok: errors.length === 0, errors, warnings, normalized: entry };
};

export const validateDecisionPromote = (entry: DecisionRecord): ValidationSummary<DecisionRecord> => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  if (!entry.context)
    errors.push(issue("decision_context_required", "context is required.", "Add context.", "decision_record"));
  if (!entry.decision)
    errors.push(issue("decision_decision_required", "decision is required.", "Add decision.", "decision_record"));
  if (!entry.tradeoffs)
    errors.push(issue("decision_tradeoffs_required", "tradeoffs is required.", "Add tradeoffs.", "decision_record"));
  if (!entry.outcome)
    errors.push(issue("decision_outcome_required", "outcome is required.", "Add outcome.", "decision_record"));
  return { ok: errors.length === 0, errors, warnings, normalized: entry };
};

export const validateSignalCreate = (entry: SignalLogEntry): ValidationSummary<SignalLogEntry> => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  if (!entry.date)
    warnings.push(issue("signal_date", "Missing date.", "Add a YYYY-MM-DD date.", "signal_log"));
  if (!entry.signal)
    warnings.push(issue("signal_text", "Missing signal.", "Describe the signal.", "signal_log"));
  if (!entry.tags || entry.tags.length === 0)
    warnings.push(issue("signal_tags", "Missing tags.", "Add one or more tags.", "signal_log"));
  return { ok: errors.length === 0, errors, warnings, normalized: entry };
};

export const validateSignalPromote = (entry: SignalLogEntry): ValidationSummary<SignalLogEntry> => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  if (!entry.date) errors.push(issue("signal_date_required", "date is required.", "Add a date.", "signal_log"));
  if (!entry.signal)
    errors.push(issue("signal_text_required", "signal is required.", "Describe the signal.", "signal_log"));
  if (!entry.tags || entry.tags.length === 0)
    errors.push(issue("signal_tags_required", "tags are required.", "Add tags.", "signal_log"));
  return { ok: errors.length === 0, errors, warnings, normalized: entry };
};

export const validateProjectNotesCsv = (csvText: string) => {
  const rows = parseProjectNoteRows(csvText);
  const rowIssues: Array<{ row: number; errors: ValidationIssue[] }> = [];
  rows.forEach((row, index) => {
    const result = validateProjectNoteRowPromote(row);
    if (!result.ok) {
      rowIssues.push({ row: index + 2, errors: result.errors });
    }
  });
  return rowIssues;
};
