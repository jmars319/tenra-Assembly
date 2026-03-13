import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getPrismaClient } from "@/lib/prisma";

const EXPIRY_MINUTES = 60;

const readEmail = async (request: Request) => {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return typeof body?.email === "string" ? body.email : "";
  }
  const formData = await request.formData().catch(() => null);
  const email = formData?.get("email");
  return typeof email === "string" ? email : "";
};

export async function POST(request: Request) {
  const email = (await readEmail(request)).trim().toLowerCase();
  const isForm = (request.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded");
  if (!email) {
    if (isForm) {
      return NextResponse.redirect(new URL("/forgot?error=1", request.url));
    }
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60_000);
    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });
    if (!isForm) {
      return NextResponse.json({
        ok: true,
        resetUrl: `${new URL(request.url).origin}/reset/${token}`,
      });
    }
  }

  if (isForm) {
    return NextResponse.redirect(new URL("/forgot?sent=1", request.url));
  }

  return NextResponse.json({ ok: true });
}
