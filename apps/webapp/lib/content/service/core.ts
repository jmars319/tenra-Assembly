import { Prisma } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
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
  ValidationSummary,
} from "@/lib/content/types";
import {
  validateBlogFeatureCreate,
  validateChangeLogCreate,
  validateDecisionCreate,
  validateFieldNotesCreate,
  validateProjectNoteRowCreate,
  validateSignalCreate,
  validateSystemsMemoCreate,
} from "@/lib/content/validators";

import { createAudit, normalizeArray, requireDb, validatePromotion } from "./shared";

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
