import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { requireApiContext } from "@/lib/auth/api";
import { isOwnerOrAdmin } from "@/lib/auth/guard";

type IncomingStyle = {
  id?: string;
  name?: string;
  description?: string;
  instructions?: Record<string, unknown>;
};

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const styles = await prisma.workspaceStyle.findMany({
    where: { workspaceId: auth.context.workspaceId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ styles });
}

export async function POST(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.response;
  if (!isOwnerOrAdmin(auth.context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json();
  const stylesInput: IncomingStyle[] = Array.isArray(body?.styles) ? body.styles : [];
  const cleaned = stylesInput
    .map((style) => ({
      id: typeof style.id === "string" ? style.id : undefined,
      name: typeof style.name === "string" ? style.name.trim() : "",
      description: typeof style.description === "string" ? style.description.trim() : null,
      instructions:
        style.instructions && typeof style.instructions === "object" ? style.instructions : {},
    }))
    .filter((style) => style.name.length > 0);

  const prisma = getPrismaClient();
  const existing = await prisma.workspaceStyle.findMany({
    where: { workspaceId: auth.context.workspaceId },
  });
  const existingIds = new Set(existing.map((style) => style.id));
  const incomingIds = new Set(cleaned.map((style) => style.id).filter(Boolean) as string[]);

  const updates = cleaned.filter((style) => style.id && existingIds.has(style.id));
  const creates = cleaned.filter((style) => !style.id);

  await prisma.$transaction([
    prisma.workspaceStyle.deleteMany({
      where: {
        workspaceId: auth.context.workspaceId,
        isPreset: false,
        id: { notIn: Array.from(incomingIds) },
      },
    }),
    ...updates.map((style) =>
      prisma.workspaceStyle.update({
        where: { id: style.id as string },
        data: {
          name: style.name,
          description: style.description,
          instructions: style.instructions as never,
        },
      }),
    ),
    ...creates.map((style) =>
      prisma.workspaceStyle.create({
        data: {
          workspaceId: auth.context.workspaceId,
          name: style.name,
          description: style.description,
          instructions: style.instructions as never,
          isPreset: false,
          createdByUserId: auth.context.user.id,
        },
      }),
    ),
  ]);

  const updated = await prisma.workspaceStyle.findMany({
    where: { workspaceId: auth.context.workspaceId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ styles: updated });
}
