import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { requireApiContext } from "@/lib/auth/api";
import { isOwnerOrAdmin } from "@/lib/auth/guard";
import { encryptApiKey } from "@/lib/workspace/apiKey";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const record = await prisma.workspaceApiKey.findUnique({
    where: { workspaceId: auth.context.workspaceId },
  });
  return NextResponse.json({
    configured: Boolean(record?.apiKeyCipher),
    provider: record?.provider ?? "openai",
    last4: record?.apiKeyLast4 ?? null,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.response;
  if (!isOwnerOrAdmin(auth.context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json();
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (!apiKey) {
    return NextResponse.json({ error: "apiKey is required." }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const cipher = encryptApiKey(apiKey);
  const last4 = apiKey.slice(-4);
  const record = await prisma.workspaceApiKey.upsert({
    where: { workspaceId: auth.context.workspaceId },
    update: { apiKeyCipher: cipher, apiKeyLast4: last4 },
    create: {
      workspaceId: auth.context.workspaceId,
      provider: "openai",
      apiKeyCipher: cipher,
      apiKeyLast4: last4,
    },
  });

  return NextResponse.json({
    configured: Boolean(record.apiKeyCipher),
    provider: record.provider,
    last4: record.apiKeyLast4 ?? null,
  });
}

export async function DELETE() {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.response;
  if (!isOwnerOrAdmin(auth.context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const prisma = getPrismaClient();
  await prisma.workspaceApiKey.deleteMany({ where: { workspaceId: auth.context.workspaceId } });
  return NextResponse.json({ configured: false });
}
