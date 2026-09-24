import type { FieldSignals } from "../types";

export function extractFieldSignals(element: HTMLElement): FieldSignals {
  const tag = element.tagName.toLowerCase();
  const inputEl = element as HTMLInputElement;

  const type = inputEl.type ? inputEl.type.toLowerCase() : "";
  const id = (element.id || "").toLowerCase();
  const name = (element.getAttribute("name") || "").toLowerCase();
  const autocomplete = (element.getAttribute("autocomplete") || "").toLowerCase();
  const placeholder = (element.getAttribute("placeholder") || "").toLowerCase();
  const ariaLabel = (
    element.getAttribute("aria-label") ||
    element.getAttribute("aria-description") ||
    ""
  ).toLowerCase();

  // Find associated label text
  let labelText = "";
  if (element.id) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${element.id}"]`);
    if (label && label.textContent) {
      labelText = label.textContent.trim().toLowerCase();
    }
  }

  if (!labelText) {
    const parentLabel = element.closest("label");
    if (parentLabel && parentLabel.textContent) {
      labelText = parentLabel.textContent.trim().toLowerCase();
    }
  }

  if (!labelText && element.parentElement) {
    const siblingLabel = element.parentElement.querySelector("label");
    if (siblingLabel && siblingLabel.textContent) {
      labelText = siblingLabel.textContent.trim().toLowerCase();
    }
  }

  // Nearby text from parent or container
  let nearbyText = "";
  if (element.parentElement) {
    nearbyText = (element.parentElement.textContent || "").trim().toLowerCase();
  }

  return {
    tag,
    type,
    id,
    name,
    autocomplete,
    placeholder,
    ariaLabel,
    labelText,
    nearbyText,
  };
}
