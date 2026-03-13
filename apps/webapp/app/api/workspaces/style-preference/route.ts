import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { requireApiContext } from "@/lib/auth/api";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const preference = await prisma.userStylePreference.findUnique({
    where: {
      userId_workspaceId: {
        userId: auth.context.user.id,
        workspaceId: auth.context.workspaceId,
      },
    },
  });

  return NextResponse.json({ preference });
}

export async function POST(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const defaultStyleId = typeof body?.defaultStyleId === "string" ? body.defaultStyleId : null;

  const prisma = getPrismaClient();
  const preference = await prisma.userStylePreference.upsert({
    where: {
      userId_workspaceId: {
        userId: auth.context.user.id,
        workspaceId: auth.context.workspaceId,
      },
    },
    update: { defaultStyleId },
    create: {
      userId: auth.context.user.id,
      workspaceId: auth.context.workspaceId,
      defaultStyleId,
    },
  });

  return NextResponse.json({ preference });
}
