import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { requireApiContext } from "@/lib/auth/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const body = await request.json().catch(() => ({}));
  const note = typeof body?.note === "string" ? body.note : undefined;
  const auth = await requireApiContext("SCHEDULING");
  if (!auth.ok) return auth.response;
  const store = getStore(auth.context.workspaceId);
  const schedule = await store.updateScheduleStatus(resolvedParams.id, "REJECTED", note);
  if (!schedule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(schedule);
}
