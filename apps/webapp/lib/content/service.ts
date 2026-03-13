import { Prisma, PrismaClient } from "@prisma/client";
import type { ScheduleStatus } from "@prisma/client";
import { getPrismaClient } from "@/lib/prisma";
import { getAuditLabel } from "@/lib/audit/labels";
import type {
  BlogFeature,
  CadenceTarget,
  ChangeLogEntry,
  ContentSource,
  ContentStatus,
  ContentType,
  DecisionRecord,
  ProjectNoteRow,
  SignalLogEntry,
  SystemsMemo,
  ValidationIssue,
  ValidationSummary,
} from "@/lib/content/types";
import {
  validateBlogFeatureCreate,
  validateBlogFeaturePromote,
  validateChangeLogCreate,
  validateChangeLogPromote,
  validateDecisionCreate,
  validateDecisionPromote,
  validateFieldNotesCreate,
  validateFieldNotesPromote,
  validateProjectNoteRowCreate,
  validateProjectNoteRowPromote,
  validateSignalCreate,
  validateSignalPromote,
  validateSystemsMemoCreate,
  validateSystemsMemoPromote,
} from "@/lib/content/validators";
import { parseProjectNoteRows } from "@/lib/content/parsers";

type CreateContentInput = {
  type: ContentType;
  status?: ContentStatus;
  title?: string | null;
  summary?: string | null;
  body?: string | null;
  rawInput?: string | null;
  structured?: unknown;
  aiMeta?: Prisma.InputJsonValue | null;
  source?: ContentSource;
  cadenceTarget?: CadenceTarget | null;
  relatedSlugs?: string[] | string | null;
  topics?: string[] | string | null;
  format?: "json" | "md";
};

const requireDb = () => {
  if (process.env.STORAGE_MODE !== "db") {
    throw new Error("Content Ops requires STORAGE_MODE=db.");
  }
};

const normalizeArray = (value?: string[] | string | null) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const createAudit = async (
  prisma: PrismaClient,
  workspaceId: string,
  action: string,
  entityId: string,
  note?: string,
  metadata?: Prisma.InputJsonValue,
  actorUserId?: string,
) =>
  prisma.auditLog.create({
    data: {
      workspaceId,
      actor: "system:content_ops",
      actorUserId,
      action,
      actionLabel: getAuditLabel(action),
      entityType: "ContentItem",
      entityId,
      note,
      metadata,
    },
  });

export const createContentItem = async (
  workspaceId: string,
  input: CreateContentInput,
  actorUserId?: string,
) => {
  requireDb();
  const prisma = getPrismaClient();
  const status: ContentStatus = input.status ?? "DRAFT";
  const relatedSlugs = normalizeArray(input.relatedSlugs);
  const topics = normalizeArray(input.topics);

  let structured: unknown = input.structured ?? null;
  let body = input.body ?? null;
  let title = input.title ?? null;
  let summary = input.summary ?? null;
  const rawInput = input.rawInput ?? null;
  let validation: ValidationSummary | null = null;

  const applyValidation = (result: ValidationSummary, normalizedBody?: string) => {
    validation = result;
    if (result.normalized && input.type === "FIELD_NOTE") {
      const bullets = (result.normalized as { bullets: string[] }).bullets;
      body = bullets.map((item) => `- ${item}`).join("\n");
    }
    if (input.type === "SYSTEMS_MEMO") {
      summary = summary ?? (result.normalized as SystemsMemo | undefined)?.thesis ?? null;
    }
    if (input.type === "BLOG_FEATURE") {
      const blog = result.normalized as BlogFeature | undefined;
      if (blog) {
        title = title ?? blog.title;
        body = blog.body;
        summary = summary ?? blog.body.slice(0, 180);
        topics.push(blog.primary_keyword);
        if (blog.related_keywords) topics.push(...blog.related_keywords);
      }
    }
    if (input.type === "PROJECT_NOTE") {
      const row = result.normalized as ProjectNoteRow | undefined;
      if (row) {
        title = title ?? row.metric;
        summary = summary ?? row.detail;
        relatedSlugs.push(row.caseStudySlug);
      }
    }
    if (input.type === "CHANGE_LOG") {
      const entry = result.normalized as ChangeLogEntry | undefined;
      if (entry) {
        title = title ?? entry.change;
        summary = summary ?? entry.impact;
      }
    }
    if (input.type === "DECISION_RECORD") {
      const entry = result.normalized as DecisionRecord | undefined;
      if (entry) {
        title = title ?? entry.decision;
        summary = summary ?? entry.outcome;
      }
    }
    if (input.type === "SIGNAL_LOG") {
      const entry = result.normalized as SignalLogEntry | undefined;
      if (entry) {
        title = title ?? entry.signal;
        summary = summary ?? entry.signal;
        topics.push(...entry.tags);
      }
    }
    if (normalizedBody) body = normalizedBody;
  };

  if (input.type === "FIELD_NOTE") {
    const result = validateFieldNotesCreate(rawInput || body || "");
    structured = result.normalized ?? null;
    applyValidation(result);
  }

  if (input.type === "PROJECT_NOTE") {
    const row = structured as ProjectNoteRow | null;
    if (!row) {
      validation = {
        ok: false,
        errors: [{ code: "project_note_missing", message: "Project Note requires structured row data.", hint: "Fill the Project Note row fields.", field: "project_note" }],
        warnings: [],
      };
    } else {
      const result = validateProjectNoteRowCreate(row);
      structured = result.normalized ?? row;
      applyValidation(result);
    }
  }

  if (input.type === "SYSTEMS_MEMO") {
    const result = validateSystemsMemoCreate(rawInput || body || "", input.format ?? "md");
    structured = result.normalized ?? null;
    title = title ?? "Systems Memo";
    applyValidation(result);
  }

  if (input.type === "BLOG_FEATURE") {
    const result = validateBlogFeatureCreate(rawInput || body || "");
    structured = result.normalized ?? null;
    applyValidation(result);
  }

  if (input.type === "CHANGE_LOG") {
    const entry = structured as ChangeLogEntry | null;
    if (!entry) {
      validation = {
        ok: false,
        errors: [{ code: "change_log_missing", message: "Change Log requires structured entry data.", hint: "Fill date/change/impact fields.", field: "change_log" }],
        warnings: [],
      };
    } else {
      const result = validateChangeLogCreate(entry);
      structured = result.normalized ?? entry;
      applyValidation(result);
    }
  }

  if (input.type === "DECISION_RECORD") {
    const entry = structured as DecisionRecord | null;
    if (!entry) {
      validation = {
        ok: false,
        errors: [{ code: "decision_missing", message: "Decision Record requires structured entry data.", hint: "Fill context/decision/tradeoffs/outcome.", field: "decision_record" }],
        warnings: [],
      };
    } else {
      const result = validateDecisionCreate(entry);
      structured = result.normalized ?? entry;
      applyValidation(result);
    }
  }

  if (input.type === "SIGNAL_LOG") {
    const entry = structured as SignalLogEntry | null;
    if (!entry) {
      validation = {
        ok: false,
        errors: [{ code: "signal_missing", message: "Signal Log requires structured entry data.", hint: "Fill date/signal/tags.", field: "signal_log" }],
        warnings: [],
      };
    } else {
      const result = validateSignalCreate(entry);
      structured = result.normalized ?? entry;
      applyValidation(result);
    }
  }

  const validationResult = validation ?? { ok: true, errors: [], warnings: [] };

  if (!validationResult.ok) {
    return { ok: false, validation: validationResult };
  }

  if ((status === "READY" || status === "APPROVED") && validationResult.ok) {
    const strict = await validatePromotion({
      type: input.type,
      rawInput: rawInput || body || "",
      structured: structured as Prisma.InputJsonValue,
      format: input.format ?? "md",
    });
    if (!strict.ok) {
      return { ok: false, validation: strict };
    }
  }

  const created = await prisma.contentItem.create({
    data: {
      workspaceId,
      type: input.type,
      status,
      title,
      summary,
      body,
      rawInput,
      structured: structured === null ? Prisma.JsonNull : (structured as Prisma.InputJsonValue),
      aiMeta: input.aiMeta === null ? Prisma.JsonNull : (input.aiMeta as Prisma.InputJsonValue | undefined),
      source: input.source ?? "MANUAL",
      cadenceTarget: input.cadenceTarget ?? null,
      relatedSlugs,
      topics,
    },
  });

  await createAudit(prisma, workspaceId, "content_create", created.id, undefined, {
    type: input.type,
    status,
  }, actorUserId);

  return { ok: true, item: created, validation: validationResult };
};

export const listContentItems = async (
  workspaceId: string,
  filters: { type?: ContentType; status?: ContentStatus },
) => {
  requireDb();
  const prisma = getPrismaClient();
  return prisma.contentItem.findMany({
    where: {
      workspaceId,
      type: filters.type,
      status: filters.status,
    },
    orderBy: { updatedAt: "desc" },
    include: { attachments: true },
  });
};

export const getContentItem = async (workspaceId: string, id: string) => {
  requireDb();
  const prisma = getPrismaClient();
  return prisma.contentItem.findFirst({
    where: { id, workspaceId },
    include: { attachments: true, scheduleProposals: true },
  });
};

export const updateContentItem = async (
  workspaceId: string,
  id: string,
  updates: {
    title?: string | null;
    summary?: string | null;
    body?: string | null;
    rawInput?: string | null;
    structured?: Prisma.InputJsonValue | null;
    aiMeta?: Prisma.InputJsonValue | null;
    actorUserId?: string;
  },
) => {
  requireDb();
  const prisma = getPrismaClient();
  const existing = await prisma.contentItem.findFirst({ where: { id, workspaceId } });
  if (!existing) {
    return { ok: false, validation: { ok: false, errors: [{ code: "content_missing", message: "Content item not found." }], warnings: [] } };
  }

  const updated = await prisma.contentItem.update({
    where: { id },
    data: {
      title: updates.title === null ? null : updates.title ?? undefined,
      summary: updates.summary === null ? null : updates.summary ?? undefined,
      body: updates.body === null ? null : updates.body ?? undefined,
      rawInput: updates.rawInput === null ? null : updates.rawInput ?? undefined,
      structured: updates.structured === null ? Prisma.JsonNull : updates.structured,
      aiMeta: updates.aiMeta === null ? Prisma.JsonNull : updates.aiMeta,
    },
  });

  await createAudit(prisma, workspaceId, "content_update", id, undefined, undefined, updates.actorUserId);
  return { ok: true, item: updated, validation: { ok: true, errors: [], warnings: [] } };
};

export const createContentScheduleProposal = async (input: {
  workspaceId: string;
  contentItemId: string;
  channel: string;
  scheduledFor: Date;
  rationale?: string;
  assumptions?: string;
}) => {
  requireDb();
  const prisma = getPrismaClient();
  const item = await prisma.contentItem.findFirst({
    where: { id: input.contentItemId, workspaceId: input.workspaceId },
  });
  if (!item) {
    return { ok: false, error: "Content item not found." };
  }
  if (item.status !== "APPROVED") {
    return { ok: false, error: "Content item must be APPROVED before scheduling." };
  }

  const proposal = await prisma.contentScheduleProposal.create({
    data: {
      workspaceId: input.workspaceId,
      contentItemId: input.contentItemId,
      status: "NEEDS_REVIEW",
      channel: input.channel,
      scheduledFor: input.scheduledFor,
      rationale: input.rationale,
      assumptions: input.assumptions,
    },
  });

  await createAudit(prisma, input.workspaceId, "content_schedule_proposed", proposal.id, undefined, {
    contentItemId: input.contentItemId,
    channel: input.channel,
  });

  return { ok: true, proposal };
};

export const updateContentScheduleStatus = async (
  workspaceId: string,
  id: string,
  status: ScheduleStatus,
) => {
  requireDb();
  const prisma = getPrismaClient();
  const proposal = await prisma.contentScheduleProposal.findFirst({
    where: { id, workspaceId },
  });
  if (!proposal) {
    return { ok: false, error: "Schedule proposal not found." };
  }

  const updated = await prisma.contentScheduleProposal.update({
    where: { id },
    data: { status },
  });

  await createAudit(prisma, workspaceId, "content_schedule_status", proposal.id, undefined, { status });
  return { ok: true, proposal: updated };
};

export const updateContentStatus = async (
  workspaceId: string,
  id: string,
  status: ContentStatus,
  note?: string,
  actorUserId?: string,
) => {
  requireDb();
  const prisma = getPrismaClient();
  const item = await prisma.contentItem.findFirst({ where: { id, workspaceId } });
  if (!item) {
    return { ok: false, validation: { ok: false, errors: [{ code: "content_missing", message: "Content item not found." }], warnings: [] } };
  }

  if (status === "READY" || status === "APPROVED") {
    const strict = await validatePromotion({
      type: item.type,
      rawInput: item.rawInput || item.body || "",
      structured: item.structured,
      format: "md",
    });
    if (!strict.ok) {
      return { ok: false, validation: strict };
    }
  }

  const updated = await prisma.contentItem.update({
    where: { id },
    data: { status },
  });
  await createAudit(prisma, workspaceId, "content_status", id, note, { status }, actorUserId);
  return { ok: true, item: updated, validation: { ok: true, errors: [], warnings: [] } };
};

export const attachContent = async (
  workspaceId: string,
  contentItemId: string,
  attachment: { fileName: string; mimeType: string; textContent: string },
) => {
  requireDb();
  const prisma = getPrismaClient();
  const existing = await prisma.contentItem.findFirst({
    where: { id: contentItemId, workspaceId },
  });
  if (!existing) {
    return null;
  }
  return prisma.contentAttachment.create({
    data: {
      contentItemId,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      textContent: attachment.textContent,
    },
  });
};

export const importProjectNotes = async (
  workspaceId: string,
  csvText: string,
  status: ContentStatus = "DRAFT",
  actorUserId?: string,
) => {
  requireDb();
  const prisma = getPrismaClient();
  const rows = parseProjectNoteRows(csvText);
  const results: Array<{ row: number; errors: ValidationIssue[] }> = [];
  const created: string[] = [];

  for (const [index, row] of rows.entries()) {
    const validation = validateProjectNoteRowPromote(row);
    if (!validation.ok) {
      results.push({ row: index + 2, errors: validation.errors });
      continue;
    }

    const item = await prisma.contentItem.create({
      data: {
        workspaceId,
        type: "PROJECT_NOTE",
        status,
        title: row.metric,
        summary: row.detail,
        structured: row as Prisma.InputJsonValue,
        relatedSlugs: [row.caseStudySlug],
        source: "UPLOAD",
      },
    });

    await prisma.contentAttachment.create({
      data: {
        contentItemId: item.id,
        fileName: "project-notes.csv",
        mimeType: "text/csv",
        textContent: csvText,
      },
    });

    created.push(item.id);
  }

  if (created.length) {
    await createAudit(
      prisma,
      workspaceId,
      "content_import",
      created[0],
      `Imported ${created.length} project notes.`,
      undefined,
      actorUserId,
    );
  }

  return { createdCount: created.length, errors: results };
};

const validatePromotion = async (input: {
  type: ContentType;
  rawInput: string;
  structured: Prisma.InputJsonValue | null;
  format: "json" | "md";
}): Promise<ValidationSummary> => {
  if (input.type === "FIELD_NOTE") {
    return validateFieldNotesPromote(input.rawInput);
  }
  if (input.type === "SYSTEMS_MEMO") {
    return validateSystemsMemoPromote(input.rawInput, input.format);
  }
  if (input.type === "BLOG_FEATURE") {
    return validateBlogFeaturePromote(input.rawInput);
  }
  if (input.type === "PROJECT_NOTE") {
    const row = input.structured as ProjectNoteRow | null;
    if (!row) {
      return { ok: false, errors: [{ code: "project_note_missing", message: "Project Note row missing." }], warnings: [] };
    }
    return validateProjectNoteRowPromote(row);
  }
  if (input.type === "CHANGE_LOG") {
    const entry = input.structured as ChangeLogEntry | null;
    if (!entry) {
      return { ok: false, errors: [{ code: "change_log_missing", message: "Change Log entry missing." }], warnings: [] };
    }
    return validateChangeLogPromote(entry);
  }
  if (input.type === "DECISION_RECORD") {
    const entry = input.structured as DecisionRecord | null;
    if (!entry) {
      return { ok: false, errors: [{ code: "decision_missing", message: "Decision Record missing." }], warnings: [] };
    }
    return validateDecisionPromote(entry);
  }
  if (input.type === "SIGNAL_LOG") {
    const entry = input.structured as SignalLogEntry | null;
    if (!entry) {
      return { ok: false, errors: [{ code: "signal_missing", message: "Signal Log entry missing." }], warnings: [] };
    }
    return validateSignalPromote(entry);
  }
  return { ok: true, errors: [], warnings: [] };
};

export const getContentStatus = async (workspaceId: string) => {
  requireDb();
  const prisma = getPrismaClient();
  const grouped = await prisma.contentItem.groupBy({
    by: ["type", "status"],
    where: { workspaceId },
    _count: { _all: true },
  });

  const counts: Record<string, Record<string, number>> = {};
  grouped.forEach((entry) => {
    if (!counts[entry.type]) counts[entry.type] = {};
    counts[entry.type][entry.status] = entry._count._all;
  });

  const cadenceItems = await prisma.contentItem.findMany({
    where: { cadenceTarget: { not: null }, workspaceId },
    orderBy: { createdAt: "desc" },
  });

  const cadenceMap: Record<string, number> = {
    MONTHLY: 30,
    BIMONTHLY: 60,
    QUARTERLY: 90,
    SIX_WEEKS: 42,
    AD_HOC: 9999,
  };

  const seen = new Set<string>();
  const reminders = cadenceItems
    .filter((item) => {
      if (seen.has(item.type)) return false;
      seen.add(item.type);
      const targetDays = item.cadenceTarget ? cadenceMap[item.cadenceTarget] : 0;
      if (targetDays <= 0 || targetDays >= 9999) return false;
      const ageDays = (Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return ageDays >= targetDays;
    })
    .map((item) => ({
      type: item.type,
      lastCreatedAt: item.createdAt,
      cadenceTarget: item.cadenceTarget,
    }));

  return { counts, reminders };
};

export const getCoverageMatrix = async (workspaceId: string) => {
  requireDb();
  const prisma = getPrismaClient();
  const items = await prisma.contentItem.findMany({
    where: {
      workspaceId,
      type: { in: ["BLOG_FEATURE", "SYSTEMS_MEMO", "FIELD_NOTE"] },
      topics: { isEmpty: false },
    },
  });

  const matrix: Record<string, Record<string, number>> = {};
  items.forEach((item) => {
    item.topics.forEach((topic) => {
      if (!matrix[topic]) {
        matrix[topic] = { BLOG_FEATURE: 0, SYSTEMS_MEMO: 0, FIELD_NOTE: 0 };
      }
      matrix[topic][item.type] += 1;
    });
  });

  return { matrix };
};
