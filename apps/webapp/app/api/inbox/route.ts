import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { requireApiContext } from "@/lib/auth/api";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.response;
  const store = getStore(auth.context.workspaceId);
  const data = await store.listInbox();
  return NextResponse.json(data);
}
