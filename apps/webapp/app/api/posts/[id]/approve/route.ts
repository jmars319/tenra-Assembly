import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { requireApiContext } from "@/lib/auth/api";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const auth = await requireApiContext();
  if (!auth.ok) return auth.response;
  const store = getStore(auth.context.workspaceId);
  const post = await store.updatePostStatus(resolvedParams.id, "APPROVED");
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(post);
}
