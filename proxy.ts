import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isValidSessionToken, setSessionCookie } from "@/lib/session";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = await isValidSessionToken(
    request.cookies.get(SESSION_COOKIE)?.value
  );

  if (authed) {
    const response =
      pathname === "/login"
        ? NextResponse.redirect(new URL("/", request.url))
        : NextResponse.next();
    // Sliding idle timeout: every authenticated request resets the clock.
    await setSessionCookie(response);
    return response;
  }

  if (pathname === "/login" || pathname === "/api/auth") {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icon.svg|apple-touch-icon.png).*)",
  ],
};
