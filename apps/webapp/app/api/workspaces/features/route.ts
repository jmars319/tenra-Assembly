import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { requireApiContext } from "@/lib/auth/api";
import { isOwnerOrAdmin } from "@/lib/auth/guard";
import { FEATURE_KEYS } from "@/lib/workspace/features";
import type { FeatureKey } from "@prisma/client";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const flags = await prisma.workspaceFeature.findMany({
    where: { workspaceId: auth.context.workspaceId },
  });
  const featureMap = flags.reduce<Record<string, boolean>>((acc, flag) => {
    acc[flag.key] = flag.enabled;
    return acc;
  }, {});

  FEATURE_KEYS.forEach((key) => {
    if (featureMap[key] === undefined) featureMap[key] = false;
  });

  return NextResponse.json({ features: featureMap });
}

export async function POST(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.response;
  if (!isOwnerOrAdmin(auth.context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json();
  const updates = Array.isArray(body?.updates) ? body.updates : [];
  const valid = updates.filter(
    (entry: { key?: string; enabled?: boolean }) =>
      typeof entry?.key === "string" &&
      FEATURE_KEYS.includes(entry.key as never) &&
      typeof entry?.enabled === "boolean",
  );

  const prisma = getPrismaClient();
  await prisma.$transaction(
    valid.map((entry: { key: string; enabled: boolean }) =>
      prisma.workspaceFeature.upsert({
        where: {
          workspaceId_key: {
            workspaceId: auth.context.workspaceId,
            key: entry.key as FeatureKey,
          },
        },
        update: { enabled: entry.enabled },
        create: {
          workspaceId: auth.context.workspaceId,
          key: entry.key as FeatureKey,
          enabled: entry.enabled,
        },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
