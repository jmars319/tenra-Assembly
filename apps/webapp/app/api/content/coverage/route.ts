import { NextResponse } from "next/server";
import { getCoverageMatrix } from "@/lib/content/service";
import { requireApiContext } from "@/lib/auth/api";

export async function GET() {
  try {
    const auth = await requireApiContext("CONTENT_OPS");
    if (!auth.ok) return auth.response;
    const data = await getCoverageMatrix(auth.context.workspaceId);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Coverage failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
