import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const sessionCookies = ["assembly_session", "ledger_session"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/logout") ||
    pathname.startsWith("/forgot") ||
    pathname.startsWith("/reset") ||
    pathname.startsWith("/accept-invite") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  const hasCookie = sessionCookies.some((cookieName) => Boolean(request.cookies.get(cookieName)?.value));

  if (!hasCookie) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
