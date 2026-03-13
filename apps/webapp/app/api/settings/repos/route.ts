import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { requireApiContext } from "@/lib/auth/api";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.response;
  const store = getStore(auth.context.workspaceId);
  const repos = await store.listRepos();
  return NextResponse.json(repos);
}

export async function POST(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  if (!Array.isArray(body?.repos)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const store = getStore(auth.context.workspaceId);
  const repos = await store.updateRepos(body.repos);
  return NextResponse.json(repos);
}
