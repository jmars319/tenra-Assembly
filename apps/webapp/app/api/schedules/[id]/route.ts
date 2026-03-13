import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { requireApiContext } from "@/lib/auth/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const auth = await requireApiContext("SCHEDULING");
  if (!auth.ok) return auth.response;
  const store = getStore(auth.context.workspaceId);
  const schedule = await store.getSchedule(resolvedParams.id);
  if (!schedule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(schedule);
}
