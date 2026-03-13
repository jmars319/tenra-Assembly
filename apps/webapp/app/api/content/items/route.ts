import { NextResponse } from "next/server";
import { createContentItem, listContentItems } from "@/lib/content/service";
import { contentStatuses, contentTypes } from "@/lib/content/types";
import { requireApiContext } from "@/lib/auth/api";

export async function GET(request: Request) {
  try {
    const auth = await requireApiContext("CONTENT_OPS");
    if (!auth.ok) return auth.response;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? undefined;
    const status = searchParams.get("status") ?? undefined;

    const safeType = type && contentTypes.includes(type as never) ? (type as never) : undefined;
    const safeStatus =
      status && contentStatuses.includes(status as never) ? (status as never) : undefined;

    const items = await listContentItems(auth.context.workspaceId, {
      type: safeType,
      status: safeStatus,
    });
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Content list failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiContext("CONTENT_OPS");
    if (!auth.ok) return auth.response;
    const body = await request.json();
    const result = await createContentItem(auth.context.workspaceId, body, auth.context.user.id);
    if (!result.ok) {
      return NextResponse.json({ ok: false, validation: result.validation }, { status: 400 });
    }

    return NextResponse.json({ ok: true, item: result.item, validation: result.validation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Content create failed.";
    return NextResponse.json({ ok: false, validation: { ok: false, errors: [{ code: "content_create_failed", message }], warnings: [] } }, { status: 400 });
  }
}
