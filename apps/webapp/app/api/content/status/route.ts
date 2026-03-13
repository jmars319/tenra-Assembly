import { NextResponse } from "next/server";
import { getContentStatus } from "@/lib/content/service";
import { requireApiContext } from "@/lib/auth/api";

export async function GET() {
  try {
    const auth = await requireApiContext("CONTENT_OPS");
    if (!auth.ok) return auth.response;
    const data = await getContentStatus(auth.context.workspaceId);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Content status failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
