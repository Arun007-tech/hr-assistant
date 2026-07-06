import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";

export const SESSION_COOKIE = "hr_session";

// Sliding idle timeout, not a fixed session length: every authenticated
// request re-issues a fresh token (see proxy.ts), so staying active never
// logs her out, but SESSION_IDLE_MINUTES of no requests does.
export const SESSION_IDLE_MINUTES = 30;

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ scope: "app" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_IDLE_MINUTES}m`)
    .sign(secretKey());
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey());
    return true;
  } catch {
    return false;
  }
}

// Centralized cookie read/write so the login route (initial unlock) and the
// proxy (per-request idle-timeout refresh) always agree on the session
// cookie's shape — one definition of what "locked in" means, everywhere.
export async function setSessionCookie(response: NextResponse): Promise<void> {
  response.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_IDLE_MINUTES * 60,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}
