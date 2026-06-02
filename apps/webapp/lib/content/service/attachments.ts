import { Prisma } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import { parseProjectNoteRows } from "@/lib/content/parsers";
import type { ContentStatus, ValidationIssue } from "@/lib/content/types";
import { validateProjectNoteRowPromote } from "@/lib/content/validators";

import { createAudit, requireDb } from "./shared";

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
