import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guard";
import { setActiveWorkspaceCookie } from "@/lib/auth/session";
import { FEATURE_KEYS } from "@/lib/workspace/features";

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");

const findAvailableSlug = async (base: string) => {
  const prisma = getPrismaClient();
  let candidate = base;
  let suffix = 2;
  while (await prisma.workspace.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
};

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session || !session.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const requestedSlug = typeof body?.slug === "string" ? body.slug.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Workspace name is required." }, { status: 400 });
  }

  const baseSlug = toSlug(requestedSlug || name);
  if (!baseSlug) {
    return NextResponse.json({ error: "Workspace slug is invalid." }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const slug = await findAvailableSlug(baseSlug);

  const workspace = await prisma.$transaction(async (tx) => {
    const created = await tx.workspace.create({
      data: { name, slug },
    });
    await tx.workspaceMember.create({
      data: {
        workspaceId: created.id,
        userId: session.user.id,
        role: "OWNER",
      },
    });
    await tx.workspaceFeature.createMany({
      data: FEATURE_KEYS.map((key) => ({
        workspaceId: created.id,
        key,
        enabled: true,
      })),
      skipDuplicates: true,
    });
    return created;
  });

  const response = NextResponse.json({ ok: true, workspace });
  setActiveWorkspaceCookie(response, workspace.id);
  return response;
}
