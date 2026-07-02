import "server-only";
import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return jsonError(err.message, err.status);
  }
  // Unrecognized errors (e.g. raw Postgres/network failures) may contain
  // internal details — log them server-side but never forward them as-is.
  console.error(err);
  return jsonError("Something went wrong — please try again.", 500);
}
