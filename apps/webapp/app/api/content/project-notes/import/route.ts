import { NextResponse } from "next/server";
import { importProjectNotes } from "@/lib/content/service";
import { contentStatuses } from "@/lib/content/types";
import { requireApiContext } from "@/lib/auth/api";

export async function POST(request: Request) {
  try {
    const auth = await requireApiContext("CONTENT_UPLOAD");
    if (!auth.ok) return auth.response;
    const body = await request.json();
    const csvText = typeof body?.csvText === "string" ? body.csvText : "";
    const status = body?.status as string | undefined;
    const safeStatus =
      status && contentStatuses.includes(status as never) ? (status as never) : "DRAFT";

    if (!csvText.trim()) {
      return NextResponse.json({ error: "csvText is required." }, { status: 400 });
    }

    const result = await importProjectNotes(
      auth.context.workspaceId,
      csvText,
      safeStatus,
      auth.context.user.id,
    );
    return NextResponse.json({ ok: true, validation: { ok: true, errors: [], warnings: [] }, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Project notes import failed.";
    return NextResponse.json(
      { ok: false, validation: { ok: false, errors: [{ code: "project_notes_import_failed", message }], warnings: [] } },
      { status: 400 },
    );
  }
}
