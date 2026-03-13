export const contentTypes = [
  "FIELD_NOTE",
  "PROJECT_NOTE",
  "SYSTEMS_MEMO",
  "BLOG_FEATURE",
  "CHANGE_LOG",
  "DECISION_RECORD",
  "SIGNAL_LOG",
] as const;

export type ContentType = (typeof contentTypes)[number];

export const contentStatuses = ["DRAFT", "READY", "APPROVED", "REJECTED", "ARCHIVED"] as const;
export type ContentStatus = (typeof contentStatuses)[number];

export const contentSources = ["MANUAL", "UPLOAD", "GITHUB"] as const;
export type ContentSource = (typeof contentSources)[number];

export const cadenceTargets = ["MONTHLY", "BIMONTHLY", "QUARTERLY", "SIX_WEEKS", "AD_HOC"] as const;
export type CadenceTarget = (typeof cadenceTargets)[number];

export type ValidationResult = {
  errors: string[];
  warnings: string[];
};

export type ValidationIssue = {
  code: string;
  message: string;
  hint?: string;
  field?: string;
};

export type ValidationSummary<T = unknown> = {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  normalized?: T;
};

export type ProjectNoteRow = {
  caseStudySlug: string;
  date: string;
  metric: string;
  detail: string;
  sourceLink?: string | null;
};

export type ChangeLogEntry = {
  date: string;
  change: string;
  impact: string;
};

export type DecisionRecord = {
  context: string;
  decision: string;
  tradeoffs: string;
  outcome: string;
};

export type SignalLogEntry = {
  date: string;
  signal: string;
  tags: string[];
  link?: string | null;
};

export type SystemsMemo = {
  thesis: string;
  points: string[];
  example: string;
  takeaway: string;
};

export type BlogFeature = {
  title: string;
  primary_keyword: string;
  related_keywords?: string[];
  internal_links?: string[];
  source_links?: string[];
  body: string;
};
