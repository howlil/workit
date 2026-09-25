import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

// Configure pdf.js worker in browser environments
if (typeof window !== "undefined") {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  } catch {
    // Ignore worker URL resolution error in non-browser/test environments
  }
}

export interface ExtractedFileResult {
  text: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  format: "pdf" | "docx" | "text" | "markdown" | "unknown";
}

/**
 * Extract clean textual content from a PDF ArrayBuffer using pdfjs-dist.
 */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .filter((s: string) => s.trim().length > 0)
      .join(" ");

    if (pageText.trim()) {
      pageTexts.push(pageText.trim());
    }
  }

  return pageTexts.join("\n\n");
}

/**
 * Extract clean textual content from a DOCX ArrayBuffer using mammoth.
 */
export async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return (result.value || "").trim();
}

/**
 * Normalize and extract readable text from uploaded resume file (PDF, DOCX, TXT, MD).
 */
export async function extractResumeFile(file: File): Promise<ExtractedFileResult> {
  const fileName = file.name;
  const fileSize = file.size;
  const ext = fileName.toLowerCase().split(".").pop() || "";
  let mimeType = file.type || "application/octet-stream";
  let format: ExtractedFileResult["format"] = "unknown";
  let text = "";

  if (ext === "pdf" || mimeType.includes("pdf")) {
    format = "pdf";
    mimeType = "application/pdf";
    const buffer = await file.arrayBuffer();
    text = await extractTextFromPdf(buffer);
  } else if (
    ext === "docx" ||
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("officedocument")
  ) {
    format = "docx";
    mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const buffer = await file.arrayBuffer();
    text = await extractTextFromDocx(buffer);
  } else if (ext === "md" || ext === "markdown" || mimeType.includes("markdown")) {
    format = "markdown";
    mimeType = "text/markdown";
    text = await file.text();
  } else if (ext === "txt" || ext === "text" || mimeType.includes("text")) {
    format = "text";
    mimeType = "text/plain";
    text = await file.text();
  } else {
    // Attempt plain text read as fallback
    format = "text";
    text = await file.text();
  }

  return {
    text: text.trim(),
    fileName,
    fileSize,
    mimeType,
    format,
  };
}
