import { parseScoutOpportunityHandoff } from "@assembly/shared-types/handoffs";
import type { ProjectNoteRow } from "@/lib/content/types";

export function scoutOpportunityToProjectNote(input: unknown): {
  title: string;
  rawInput: string;
  structured: ProjectNoteRow;
  summary: string;
} {
  const handoff = parseScoutOpportunityHandoff(input);
  const date = handoff.exportedAt.slice(0, 10);
  const structured: ProjectNoteRow = {
    caseStudySlug: `scout-${handoff.runId}`,
    date,
    metric: handoff.businessName,
    detail: `Scout opportunity ${handoff.candidateId} imported for Assembly content intake.`,
    sourceLink: `scout-handoff:${handoff.runId}:${handoff.candidateId}`
  };

  return {
    title: `Scout opportunity: ${handoff.businessName}`,
    summary: structured.detail,
    structured,
    rawInput: [
      `# ${handoff.businessName}`,
      "",
      `Source schema: ${handoff.schema}`,
      `Scout run: ${handoff.runId}`,
      `Candidate: ${handoff.candidateId}`,
      `URL: ${handoff.primaryUrl}`,
      "",
      handoff.evidenceMarkdown
    ].join("\n")
  };
}
