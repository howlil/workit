export async function verifyFieldValue(
  element: HTMLElement,
  expectedValue: string
): Promise<boolean> {
  // Yield microtask to allow framework event loop / state updater to settle
  await new Promise((resolve) => setTimeout(resolve, 10));

  let actualValue = "";
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    actualValue = element.value;
  } else if (element instanceof HTMLSelectElement) {
    actualValue = element.value;
  }

  return actualValue.trim() === expectedValue.trim();
}
