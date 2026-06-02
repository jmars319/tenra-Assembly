import { Prisma, PrismaClient } from "@prisma/client";

import { getAuditLabel } from "@/lib/audit/labels";
import type {
  ChangeLogEntry,
  ContentType,
  DecisionRecord,
  ProjectNoteRow,
  SignalLogEntry,
  ValidationSummary,
} from "@/lib/content/types";
import {
  validateBlogFeaturePromote,
  validateChangeLogPromote,
  validateDecisionPromote,
  validateFieldNotesPromote,
  validateProjectNoteRowPromote,
  validateSignalPromote,
  validateSystemsMemoPromote,
} from "@/lib/content/validators";

export const requireDb = () => {
  if (process.env.STORAGE_MODE !== "db") {
    throw new Error("Content Ops requires STORAGE_MODE=db.");
  }
};

export const normalizeArray = (value?: string[] | string | null) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

export const createAudit = async (
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

export const validatePromotion = async (input: {
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
