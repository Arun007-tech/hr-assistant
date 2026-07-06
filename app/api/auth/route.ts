import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const pin = typeof body?.pin === "string" ? body.pin : "";
  const expected = process.env.APP_PIN;

  if (!expected) {
    return NextResponse.json(
      { error: "APP_PIN is not configured on the server" },
      { status: 500 }
    );
  }

  if (!pin || !safeEqual(pin, expected)) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  await setSessionCookie(response);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
