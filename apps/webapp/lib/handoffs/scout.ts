import { parseScoutOpportunityHandoff } from "@assembly/shared-types/handoffs";
import type { ProjectNoteRow } from "@/lib/content/types";

export function scoutOpportunityToProjectNote(input: unknown): {
  title: string;
  rawInput: string;
  structured: ProjectNoteRow;
  summary: string;
  project: {
    name: string;
    tag: string;
  };
  relatedSlugs: string[];
  topics: string[];
  aiMeta: Record<string, unknown>;
} {
  const handoff = parseScoutOpportunityHandoff(input);
  const date = handoff.exportedAt.slice(0, 10);
  const projectTag = `SCOUT-${handoff.runId.slice(0, 10).replace(/[^a-z0-9]/giu, "").toUpperCase() || "RUN"}`;
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
    project: {
      name: `Scout opportunities: ${handoff.runId}`,
      tag: projectTag
    },
    relatedSlugs: [structured.caseStudySlug, `scout-candidate-${handoff.candidateId}`],
    topics: ["scout", "opportunity", "handoff"],
    aiMeta: {
      suiteSource: "scout",
      scoutOpportunity: {
        runId: handoff.runId,
        candidateId: handoff.candidateId,
        businessName: handoff.businessName,
        primaryUrl: handoff.primaryUrl,
        importedAt: new Date().toISOString()
      }
    },
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
