import "server-only";
import mammoth from "mammoth";
import { extractDocumentText } from "@/lib/gemini";
import { HttpError } from "@/lib/http";

export const MAX_FILE_BYTES = 4 * 1024 * 1024;

export async function fileToText(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new HttpError("File is too large — keep uploads under 4MB.", 413);
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();
    if (!text) throw new HttpError("Could not read any text from the DOCX file.", 422);
    return text;
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractDocumentText({
      mimeType: "application/pdf",
      base64: buffer.toString("base64"),
    }, "extract-pdf");
  }
  const text = buffer.toString("utf-8").trim();
  if (!text) throw new HttpError("The uploaded file appears to be empty.", 422);
  return text;
}
