import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { HttpError } from "@/lib/http";

export class AiError extends HttpError {}

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiError("GEMINI_API_KEY is not set", 500);
  return new GoogleGenAI({ apiKey });
}

function isTransient(message: string): boolean {
  return /503|UNAVAILABLE|overloaded|high demand/i.test(message);
}

function toAiError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  const message = err instanceof Error ? err.message : String(err);
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(message)) {
    return new AiError(
      "AI rate limit reached — wait a minute and try again.",
      429
    );
  }
  if (isTransient(message)) {
    return new AiError(
      "The AI model is temporarily overloaded — try again in a few seconds.",
      503
    );
  }
  return new AiError("AI request failed — try again.", 502);
}

async function generate(
  parts: Part[],
  config: Record<string, unknown>
): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client().models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: [{ role: "user", parts }],
        config,
      });
      return response.text ?? "";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt === 0 && isTransient(message)) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      throw toAiError(err);
    }
  }
  throw new AiError("AI request failed — try again.", 502);
}

export async function generateJson<T>(options: {
  prompt: string;
  schema: z.ZodType<T>;
  responseSchema: unknown;
  extraParts?: Part[];
}): Promise<T> {
  const parts: Part[] = [...(options.extraParts ?? []), { text: options.prompt }];
  const config = {
    responseMimeType: "application/json",
    responseSchema: options.responseSchema,
    temperature: 0.3,
  };
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await generate(parts, config);
    try {
      return options.schema.parse(JSON.parse(text));
    } catch (err) {
      lastError = err;
    }
  }
  console.error("Gemini JSON validation failed twice:", lastError);
  throw new AiError("AI returned an unexpected format — try again.", 502);
}

export async function extractDocumentText(file: {
  mimeType: string;
  base64: string;
}): Promise<string> {
  const text = await generate(
    [
      { inlineData: { mimeType: file.mimeType, data: file.base64 } },
      {
        text: "Extract the complete plain text of this document. Preserve section headings and bullet points as plain text lines. Output only the document text, with no commentary.",
      },
    ],
    { temperature: 0 }
  );
  if (!text.trim()) {
    throw new AiError("Could not read any text from the uploaded file.", 422);
  }
  return text.trim();
}
