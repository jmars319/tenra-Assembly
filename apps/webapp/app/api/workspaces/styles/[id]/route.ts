import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { requireApiContext } from "@/lib/auth/api";
import { isOwnerOrAdmin } from "@/lib/auth/guard";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.response;
  if (!isOwnerOrAdmin(auth.context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const resolved = await params;
  const prisma = getPrismaClient();
  const style = await prisma.workspaceStyle.findFirst({
    where: { id: resolved.id, workspaceId: auth.context.workspaceId },
  });
  if (!style) {
    return NextResponse.json({ error: "Style not found." }, { status: 404 });
  }
  if (style.isPreset) {
    return NextResponse.json({ error: "Preset styles cannot be deleted." }, { status: 400 });
  }

  await prisma.workspaceStyle.delete({ where: { id: style.id } });
  return NextResponse.json({ ok: true });
}
