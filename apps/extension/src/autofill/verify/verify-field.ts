export async function verifyFieldValue(
  element: HTMLElement,
  expectedValue: string
): Promise<boolean> {
  // Yield microtask to allow framework event loop / state updater to settle
  await new Promise((resolve) => setTimeout(resolve, 10));

  if (element instanceof HTMLInputElement && element.type === "file") {
    if (!element.files || element.files.length === 0) return false;
    const fileName = element.files[0]?.name || "";
    if (!expectedValue) return true;
    return (
      fileName.toLowerCase().includes(expectedValue.toLowerCase()) ||
      expectedValue.toLowerCase().includes(fileName.toLowerCase())
    );
  }

  let actualValue = "";
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    actualValue = element.value;
  } else if (element instanceof HTMLSelectElement) {
    actualValue = element.value;
  }

  return actualValue.trim() === expectedValue.trim();
}

