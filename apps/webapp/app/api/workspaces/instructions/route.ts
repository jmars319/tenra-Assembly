import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { requireApiContext } from "@/lib/auth/api";
import { isOwnerOrAdmin } from "@/lib/auth/guard";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const instruction = await prisma.workspaceInstruction.findUnique({
    where: { workspaceId: auth.context.workspaceId },
  });

  return NextResponse.json({ instruction });
}

export async function POST(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.response;
  if (!isOwnerOrAdmin(auth.context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json();
  const payload = {
    tone: typeof body?.tone === "string" ? body.tone.trim() : null,
    voice: typeof body?.voice === "string" ? body.voice.trim() : null,
    hardRules: typeof body?.hardRules === "string" ? body.hardRules.trim() : null,
    doList: typeof body?.doList === "string" ? body.doList.trim() : null,
    dontList: typeof body?.dontList === "string" ? body.dontList.trim() : null,
  };

  const prisma = getPrismaClient();
  const instruction = await prisma.workspaceInstruction.upsert({
    where: { workspaceId: auth.context.workspaceId },
    update: payload,
    create: { workspaceId: auth.context.workspaceId, ...payload },
  });

  return NextResponse.json({ instruction });
}
