export function writeFileInput(
  element: HTMLInputElement,
  fileOrData: File | { fileName: string; content: string; mimeType?: string }
): void {
  element.focus();

  let file: File;
  if (fileOrData instanceof File) {
    file = fileOrData;
  } else {
    file = new File(
      [fileOrData.content],
      fileOrData.fileName,
      { type: fileOrData.mimeType || "text/plain" }
    );
  }

  // Populate files using DataTransfer
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  element.files = dataTransfer.files;

  // Dispatch events to notify form listeners
  element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
}
