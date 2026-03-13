import { NextResponse } from "next/server";
import { getContentItem, updateContentItem } from "@/lib/content/service";
import { requireApiContext } from "@/lib/auth/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireApiContext("CONTENT_OPS");
    if (!auth.ok) return auth.response;
    const resolved = await params;
    const item = await getContentItem(auth.context.workspaceId, resolved.id);
    if (!item) {
      return NextResponse.json({ error: "Content item not found." }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Content item load failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    if (process.env.STORAGE_MODE !== "db") {
      return NextResponse.json({ error: "Content Ops requires STORAGE_MODE=db." }, { status: 400 });
    }
    const auth = await requireApiContext("CONTENT_OPS");
    if (!auth.ok) return auth.response;
    const resolved = await params;
    const body = await request.json();

    let structured = body?.structured;
    if (typeof structured === "string") {
      try {
        structured = JSON.parse(structured);
      } catch {
        return NextResponse.json(
          { error: "Structured JSON is invalid." },
          { status: 400 }
        );
      }
    }

    const result = await updateContentItem(auth.context.workspaceId, resolved.id, {
      title: typeof body?.title === "string" ? body.title : body?.title === null ? null : undefined,
      summary: typeof body?.summary === "string" ? body.summary : body?.summary === null ? null : undefined,
      body: typeof body?.body === "string" ? body.body : body?.body === null ? null : undefined,
      rawInput: typeof body?.rawInput === "string" ? body.rawInput : body?.rawInput === null ? null : undefined,
      structured: structured ?? undefined,
      aiMeta: body?.aiMeta ?? undefined,
      actorUserId: auth.context.user.id,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, validation: result.validation }, { status: 400 });
    }

    return NextResponse.json({ ok: true, item: result.item, validation: result.validation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Content update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
