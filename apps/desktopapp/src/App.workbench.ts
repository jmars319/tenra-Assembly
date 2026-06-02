import { getPromotionIssuesForItem } from "@assembly/domain/content";
import { buildInstructionBlock } from "@assembly/prompts/instructions";
import {
  contentTypes,
  type ChangeLogEntry,
  type ContentStatus,
  type ContentType,
  type DecisionRecord,
  type ProjectNoteRow,
  type SignalLogEntry,
} from "@assembly/shared-types/content";
import { getStylePreset, stylePresets } from "@assembly/shared-types/style";

export type AssemblyItem = {
  id: string;
  title: string;
  type: ContentType;
  styleId: string;
  source: string;
  rawInput: string;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
};

export type SidebarFilter = "active" | "approved" | "all";
export type HandoffKind = "scout" | "registry" | "derive" | "proxy";
export type WorkbenchExport = {
  exportedAt: string;
  items: AssemblyItem[];
  schema: "tenra-assembly-desktop-workbench:v1";
};

export const storageKey = "tenra-assembly-desktop-workbench:v1";

export const templates: Record<ContentType, string> = {
  FIELD_NOTE: "- What happened\n- Why it matters\n- Follow-up or next action",
  PROJECT_NOTE:
    "case_study_slug: internal-project\n" +
    "date: 2026-05-05\n" +
    "metric: workflow update\n" +
    "detail: Describe the useful change or observation.\n" +
    "source_link:",
  SYSTEMS_MEMO:
    "Thesis: State the main point.\n\n" +
    "Points:\n" +
    "- First supporting point\n" +
    "- Second supporting point\n" +
    "- Third supporting point\n\n" +
    "Example: Add a concrete example.\n\n" +
    "Takeaway: State the decision or implication.",
  BLOG_FEATURE:
    "---\n" +
    "title: Working title\n" +
    "primary_keyword: target keyword\n" +
    "related_keywords:\n" +
    "  - related term\n" +
    "---\n\n" +
    "Write the article body here. Keep claims concrete and reviewable.",
  CHANGE_LOG:
    "date: 2026-05-05\n" +
    "change: Describe what changed.\n" +
    "impact: Describe why it matters.",
  DECISION_RECORD:
    "context: What situation required a decision?\n" +
    "decision: What was decided?\n" +
    "tradeoffs: What was gained or given up?\n" +
    "outcome: What should happen next?",
  SIGNAL_LOG:
    "date: 2026-05-05\n" +
    "signal: Describe the observation.\n" +
    "tags: market, product, risk",
};

export const typeLabels: Record<ContentType, string> = {
  FIELD_NOTE: "Field note",
  PROJECT_NOTE: "Project note",
  SYSTEMS_MEMO: "Systems memo",
  BLOG_FEATURE: "Blog feature",
  CHANGE_LOG: "Change log",
  DECISION_RECORD: "Decision record",
  SIGNAL_LOG: "Signal log",
};

export const statusLabels: Record<ContentStatus, string> = {
  DRAFT: "Draft",
  READY: "Ready",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

export const handoffTemplates: Record<
  HandoffKind,
  {
    label: string;
    source: string;
    title: string;
    type: ContentType;
    rawInput: string;
  }
> = {
  scout: {
    label: "Scout evidence pack",
    source: "Scout by Tenra handoff",
    title: "Scout opportunity brief",
    type: "SIGNAL_LOG",
    rawInput:
      "date: 2026-05-05\n" +
      "signal: Paste the lead name, market, audit findings, screenshots, and opportunity classification.\n" +
      "tags: scout, lead, evidence\n" +
      "link:"
  },
  registry: {
    label: "Registry document request",
    source: "Registry by Tenra handoff",
    title: "Registry customer document",
    type: "PROJECT_NOTE",
    rawInput:
      "case_study_slug: registry-customer-document\n" +
      "date: 2026-05-05\n" +
      "metric: customer paperwork\n" +
      "detail: Paste the customer, rental, unit, balance, and requested document details.\n" +
      "source_link:"
  },
  derive: {
    label: "Derive answer card",
    source: "Derive by Tenra handoff",
    title: "Derive reasoning brief",
    type: "DECISION_RECORD",
    rawInput:
      "context: Paste the Derive question, answer, assumptions, sources, and confidence.\n" +
      "decision: State what Assembly should turn this into.\n" +
      "tradeoffs: Note what needs review before publishing or sending.\n" +
      "outcome: Define the draft, document, or task to produce."
  },
  proxy: {
    label: "Proxy-shaped output",
    source: "Proxy by Tenra handoff",
    title: "Proxy output review",
    type: "SYSTEMS_MEMO",
    rawInput:
      "context: Paste the Proxy shaped text, validation report, rewrite trace, and escalation decision.\n" +
      "decision: State whether Assembly should turn it into publishable content, a reusable template, or an internal note.\n" +
      "tradeoffs: Note any Guardrail review requirement before external delivery.\n" +
      "outcome: Define the final artifact to produce."
  }
};

export const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `assembly-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const nowIso = () => new Date().toISOString();

export const todayForFilename = () => new Date().toISOString().slice(0, 10);

export const newItem = (): AssemblyItem => {
  const now = nowIso();

  return {
    id: createId(),
    title: "Untitled field note",
    type: "FIELD_NOTE",
    styleId: stylePresets[0]?.id ?? "neutral-brief",
    source: "Manual desktop entry",
    rawInput: templates.FIELD_NOTE,
    status: "DRAFT",
    createdAt: now,
    updatedAt: now,
  };
};

export const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/[\s-]+/g, "_");

export const parseKeyValueDraft = (text: string) => {
  const values: Record<string, string> = {};

  for (const line of text.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = normalizeKey(line.slice(0, separator));
    const value = line.slice(separator + 1).trim();
    if (key) values[key] = value;
  }

  return values;
};

export const structuredPayloadForItem = (item: AssemblyItem): unknown => {
  const fields = parseKeyValueDraft(item.rawInput);

  if (item.type === "PROJECT_NOTE") {
    const row: ProjectNoteRow = {
      caseStudySlug: fields.case_study_slug ?? "",
      date: fields.date ?? "",
      metric: fields.metric ?? "",
      detail: fields.detail ?? "",
      sourceLink: fields.source_link || null,
    };
    return row;
  }

  if (item.type === "CHANGE_LOG") {
    const entry: ChangeLogEntry = {
      date: fields.date ?? "",
      change: fields.change ?? "",
      impact: fields.impact ?? "",
    };
    return entry;
  }

  if (item.type === "DECISION_RECORD") {
    const entry: DecisionRecord = {
      context: fields.context ?? "",
      decision: fields.decision ?? "",
      tradeoffs: fields.tradeoffs ?? "",
      outcome: fields.outcome ?? "",
    };
    return entry;
  }

  if (item.type === "SIGNAL_LOG") {
    const entry: SignalLogEntry = {
      date: fields.date ?? "",
      signal: fields.signal ?? "",
      tags: (fields.tags ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      link: fields.link || null,
    };
    return entry;
  }

  return undefined;
};

export const promotionIssuesForItem = (item: AssemblyItem) =>
  getPromotionIssuesForItem({
    type: item.type,
    rawInput: item.rawInput,
    structured: structuredPayloadForItem(item),
    format: "md",
  });

export const loadItems = () => {
  return [newItem()];
};

export const isAssemblyItem = (value: unknown): value is AssemblyItem => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AssemblyItem>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.rawInput === "string" &&
    typeof candidate.source === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    contentTypes.includes(candidate.type as ContentType) &&
    ["DRAFT", "READY", "APPROVED", "REJECTED", "ARCHIVED"].includes(candidate.status ?? "")
  );
};

export const parseWorkbenchImport = (input: unknown): AssemblyItem[] => {
  const items = Array.isArray(input)
    ? input
    : input && typeof input === "object" && Array.isArray((input as Partial<WorkbenchExport>).items)
      ? (input as Partial<WorkbenchExport>).items
      : null;

  if (!items || !items.every(isAssemblyItem)) {
    throw new Error("Workbench JSON must contain Assembly desktop items.");
  }

  return items;
};

export const formatShortDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

export const toMarkdown = (item: AssemblyItem) => {
  const preset = getStylePreset(item.styleId);
  const instructions = buildInstructionBlock({
    style: preset,
    context: [item.source],
  });

  return [
    `# ${item.title || "Untitled"}`,
    "",
    `Status: ${statusLabels[item.status]}`,
    `Type: ${typeLabels[item.type]}`,
    `Style: ${preset.name}`,
    `Source: ${item.source || "Manual desktop entry"}`,
    `Updated: ${item.updatedAt}`,
    item.approvedAt ? `Approved: ${item.approvedAt}` : null,
    "",
    "## Draft",
    "",
    item.rawInput.trim() || "(empty)",
    "",
    "## Instruction Pack",
    "",
    instructions.block,
  ]
    .filter((line) => line !== null)
    .join("\n");
};
