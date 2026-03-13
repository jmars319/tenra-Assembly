import type { ContentType } from "@assembly/shared-types/content";

export const contentDraftTypeGuidance: Record<ContentType, string> = {
  FIELD_NOTE: "Return 3–8 bullets, one idea per line. Keep it factual.",
  PROJECT_NOTE:
    "Return a structured row with case_study_slug, date (YYYY-MM-DD), metric, detail, source_link (optional).",
  SYSTEMS_MEMO: "Provide thesis, 3–5 points, optional example, and takeaway.",
  BLOG_FEATURE: "Write a markdown draft with a clear title and primary keyword focus.",
  CHANGE_LOG: "Provide a concise change log entry with date, change, and impact.",
  DECISION_RECORD: "Provide context, decision, tradeoffs, and outcome.",
  SIGNAL_LOG: "Provide signal statement, evidence bullets, and next action.",
};
