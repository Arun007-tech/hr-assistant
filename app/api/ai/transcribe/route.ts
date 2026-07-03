import { NextResponse } from "next/server";
import { errorResponse, jsonError } from "@/lib/http";
import { transcribeAndPolish } from "@/lib/gemini";

export const maxDuration = 60;

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const audioBase64 = typeof body?.audio_base64 === "string" ? body.audio_base64 : "";
    const mimeType = typeof body?.mime_type === "string" ? body.mime_type : "";
    const mode = body?.mode === "raw" ? "raw" : "polish";

    if (!audioBase64 || !mimeType) {
      return jsonError("audio_base64 and mime_type are required.", 400);
    }
    if (audioBase64.length > MAX_AUDIO_BYTES * 1.4) {
      return jsonError("Recording too long — keep it under ~2 minutes.", 413);
    }

    const text = await transcribeAndPolish({ mimeType, base64: audioBase64 }, mode);
    return NextResponse.json({ text });
  } catch (err) {
    return errorResponse(err);
  }
}
