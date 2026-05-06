import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth/api";
import { createContentItem } from "@/lib/content/service";
import { scoutOpportunityToProjectNote } from "@/lib/handoffs/scout";

export async function POST(request: Request) {
  try {
    const auth = await requireApiContext("CONTENT_OPS");
    if (!auth.ok) return auth.response;

    const handoff = scoutOpportunityToProjectNote(await request.json());
    const result = await createContentItem(
      auth.context.workspaceId,
      {
        type: "PROJECT_NOTE",
        status: "DRAFT",
        title: handoff.title,
        summary: handoff.summary,
        rawInput: handoff.rawInput,
        structured: handoff.structured,
        source: "UPLOAD"
      },
      auth.context.user.id
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, validation: result.validation }, { status: 400 });
    }

    return NextResponse.json({ ok: true, item: result.item, validation: result.validation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scout opportunity handoff failed.";
    return NextResponse.json(
      { ok: false, validation: { ok: false, errors: [{ code: "scout_opportunity_handoff_failed", message }], warnings: [] } },
      { status: 400 }
    );
  }
}
