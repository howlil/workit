/**
 * ResumeDropzone — drag-and-drop / click-to-upload resume file input.
 *
 * Supports PDF, DOCX, TXT, and Markdown files.  After a file is selected it
 * shows a file-card with the file name, size, format badge, and a Remove button.
 * Extraction is async — the component calls onExtracted when text is ready, and
 * onError when extraction fails.
 *
 * The component owns only UI interaction.  Text extraction is delegated to the
 * injected extractFile prop (defaults to extractResumeFile from file-text-extractor).
 */

import { useRef, useState, useCallback } from "react";
import {
  extractResumeFile,
  type ExtractedFileResult,
} from "../utils/file-text-extractor";

interface ResumeDropzoneProps {
  onExtracted: (result: ExtractedFileResult) => void;
  onError?: (message: string) => void;
  /** Override for testing — defaults to extractResumeFile */
  extractFile?: (file: File) => Promise<ExtractedFileResult>;
  "data-testid"?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FORMAT_LABEL: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  text: "TXT",
  markdown: "MD",
  unknown: "FILE",
};

export function ResumeDropzone({
  onExtracted,
  onError,
  extractFile = extractResumeFile,
  "data-testid": testId,
}: ResumeDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ExtractedFileResult | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      setIsExtracting(true);
      try {
        const result = await extractFile(file);
        setSelectedFile(result);
        onExtracted(result);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to read file.";
        onError?.(msg);
      } finally {
        setIsExtracting(false);
      }
    },
    [extractFile, onExtracted, onError]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemove = () => {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (selectedFile) {
    return (
      <div className="resume-file-card" data-testid={testId ? `${testId}-card` : "resume-file-card"}>
        <div className="resume-file-info">
          <span className="resume-file-badge">
            {FORMAT_LABEL[selectedFile.format] ?? "FILE"}
          </span>
          <div className="resume-file-details">
            <span
              className="resume-file-name"
              title={selectedFile.fileName}
              data-testid="resume-file-name"
            >
              {selectedFile.fileName}
            </span>
            <span className="resume-file-meta" data-testid="resume-file-meta">
              {formatBytes(selectedFile.fileSize)}
              {selectedFile.text.length > 0 && (
                <> · {selectedFile.text.split(/\s+/).length.toLocaleString()} words extracted</>
              )}
            </span>
          </div>
        </div>
        <div className="resume-file-actions">
          <button
            type="button"
            className="btn-file-remove"
            onClick={handleRemove}
            aria-label="Remove file"
            data-testid="btn-resume-remove"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`resume-dropzone${isDragOver ? " is-dragover" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      aria-label="Upload resume file"
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
      data-testid={testId ?? "resume-dropzone"}
    >
      <svg
        className="resume-dropzone-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <polyline points="9 15 12 12 15 15" />
      </svg>

      <span className="resume-dropzone-title">
        {isExtracting ? (
          "Extracting…"
        ) : (
          <>
            <span className="dropzone-highlight">Click to upload</span> or drag &amp; drop
          </>
        )}
      </span>
      <span className="resume-dropzone-sub">PDF, DOCX, TXT, or Markdown</span>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,.text"
        style={{ display: "none" }}
        onChange={handleFileInputChange}
        data-testid="input-resume-file"
        aria-hidden="true"
      />
    </div>
  );
}
