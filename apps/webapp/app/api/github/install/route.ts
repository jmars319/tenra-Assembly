import { NextResponse } from "next/server";
import { hasGitHubEnv } from "@/lib/github/env";
import { randomUUID } from "crypto";
import { requireApiContext } from "@/lib/auth/api";

const stateCookie = "assembly_github_state";

export async function GET(request: Request) {
  const auth = await requireApiContext("GITHUB_CONNECT");
  if (!auth.ok) return auth.response;

  if (process.env.STORAGE_MODE !== "db") {
    const url = new URL("/settings/integrations/github?error=storage", request.url);
    return NextResponse.redirect(url);
  }

  if (!hasGitHubEnv()) {
    const url = new URL("/settings/integrations/github?error=missing_env", request.url);
    return NextResponse.redirect(url);
  }

  const slug = encodeURIComponent(process.env.GITHUB_APP_SLUG as string);
  const state = randomUUID();
  const installUrl = `https://github.com/apps/${slug}/installations/new?state=${state}`;

  const response = NextResponse.redirect(installUrl);
  response.cookies.set(stateCookie, `${state}:${auth.context.workspaceId}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
