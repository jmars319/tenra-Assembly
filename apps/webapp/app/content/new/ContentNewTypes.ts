import type { ValidationIssue } from "@/lib/content/types";

export type GeneratedDraft = {
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

export type StyleOption = {
  id: string;
  name: string;
  description?: string | null;
  source: "preset" | "workspace";
};

export type FieldIssues = {
  fieldErrors: ValidationIssue[];
  fieldWarnings: ValidationIssue[];
};
