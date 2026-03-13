import "server-only";
import path from "node:path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export const MAX_UPLOAD_BYTES = 2_000_000;

const SUPPORTED_EXT = new Set([".txt", ".md", ".pdf", ".docx", ".csv"]);

const getExtension = (name: string) => path.extname(name || "").toLowerCase();

const isTextMime = (mime: string) =>
  ["text/plain", "text/markdown", "text/csv"].includes(mime);

export type IngestedAttachment = {
  fileName: string;
  mimeType: string;
  textContent: string;
  warning?: string;
};

export const ingestFiles = async (files: File[]) => {
  const attachments: IngestedAttachment[] = [];
  const warnings: string[] = [];

  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      warnings.push(`${file.name} exceeds ${Math.round(MAX_UPLOAD_BYTES / 1024)}KB and was skipped.`);
      attachments.push({
        fileName: file.name || "upload",
        mimeType: file.type || "application/octet-stream",
        textContent: "",
        warning: "Skipped: file too large.",
      });
      continue;
    }

    const ext = getExtension(file.name);
    const mimeType = file.type || "application/octet-stream";
    try {
      if (isTextMime(mimeType) || SUPPORTED_EXT.has(ext)) {
        if (ext === ".pdf") {
          const buffer = Buffer.from(await file.arrayBuffer());
          const parsed = await pdfParse(buffer);
          attachments.push({ fileName: file.name, mimeType, textContent: parsed.text || "" });
          continue;
        }
        if (ext === ".docx") {
          const buffer = Buffer.from(await file.arrayBuffer());
          const parsed = await mammoth.extractRawText({ buffer });
          attachments.push({ fileName: file.name, mimeType, textContent: parsed.value || "" });
          continue;
        }
        const text = await file.text();
        attachments.push({ fileName: file.name, mimeType, textContent: text });
        continue;
      }

      warnings.push(`${file.name} stored without text extraction.`);
      attachments.push({
        fileName: file.name,
        mimeType,
        textContent: "",
        warning: "Stored without text extraction.",
      });
    } catch {
      warnings.push(`${file.name} could not be parsed and was stored without text extraction.`);
      attachments.push({
        fileName: file.name,
        mimeType,
        textContent: "",
        warning: "Stored without text extraction.",
      });
    }
  }

  return { attachments, warnings };
};

export const buildCombinedText = (rawText: string, attachments: IngestedAttachment[]) => {
  const chunks = [rawText.trim()].filter(Boolean);
  for (const attachment of attachments) {
    if (!attachment.textContent.trim()) continue;
    chunks.push(`---\nFile: ${attachment.fileName}\n${attachment.textContent.trim()}`);
  }
  return chunks.join("\n\n");
};
