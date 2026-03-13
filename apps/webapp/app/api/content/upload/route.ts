import { NextResponse } from "next/server";
import { attachContent, createContentItem, importProjectNotes } from "@/lib/content/service";
import { contentStatuses, contentTypes } from "@/lib/content/types";
import { ingestFiles, buildCombinedText } from "@/lib/content/ingest";
import { requireApiContext } from "@/lib/auth/api";

export async function POST(request: Request) {
  try {
    const auth = await requireApiContext("CONTENT_UPLOAD");
    if (!auth.ok) return auth.response;
    const formData = await request.formData();
    const type = formData.get("type");
    const status = formData.get("status");
    const format = formData.get("format");
    if (!type || typeof type !== "string" || !contentTypes.includes(type as never)) {
      return NextResponse.json({ error: "Valid type is required." }, { status: 400 });
    }

    const safeStatus =
      typeof status === "string" && contentStatuses.includes(status as never)
        ? (status as never)
        : "DRAFT";

    const files: File[] = [];
    const single = formData.get("file");
    if (single instanceof File) files.push(single);
    for (const entry of formData.getAll("files")) {
      if (entry instanceof File) files.push(entry);
    }
    if (!files.length) {
      return NextResponse.json({ error: "File upload is required." }, { status: 400 });
    }

    const { attachments, warnings } = await ingestFiles(files);
    const textContent = buildCombinedText("", attachments);

    if (type === "PROJECT_NOTE") {
      const result = await importProjectNotes(
        auth.context.workspaceId,
        textContent,
        safeStatus,
        auth.context.user.id,
      );
      return NextResponse.json({
        ok: true,
        validation: { ok: true, errors: [], warnings: [] },
        warnings,
        ...result,
      });
    }

    const created = await createContentItem(auth.context.workspaceId, {
      type: type as never,
      status: safeStatus,
      rawInput: textContent,
      source: "UPLOAD",
      format: format === "json" ? "json" : "md",
    }, auth.context.user.id);

    if (!created.ok) {
      return NextResponse.json({ ok: false, validation: created.validation }, { status: 400 });
    }

    if (created.item) {
      for (const attachment of attachments) {
        await attachContent(auth.context.workspaceId, created.item.id, {
          fileName: attachment.fileName || "upload",
          mimeType: attachment.mimeType || "application/octet-stream",
          textContent: attachment.textContent,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      item: created.item,
      validation: created.validation,
      warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json(
      { ok: false, validation: { ok: false, errors: [{ code: "content_upload_failed", message }], warnings: [] } },
      { status: 400 },
    );
  }
}
