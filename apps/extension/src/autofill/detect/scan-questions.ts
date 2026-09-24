import { extractFieldSignals } from "./signals";
import { classifyField } from "../classify/classify-field";

export interface DetectedQuestion {
  element: HTMLTextAreaElement | HTMLInputElement;
  fieldId: string;
  questionText: string;
}

const STANDARD_PROFILE_TYPES = new Set([
  "full_name",
  "first_name",
  "last_name",
  "email",
  "phone",
  "location",
  "linkedin",
  "portfolio",
  "github",
]);

export function scanPageQuestions(
  root: Document | HTMLElement = document
): DetectedQuestion[] {
  const elements = root.querySelectorAll<HTMLTextAreaElement | HTMLInputElement>(
    "textarea, input[type='text']:not([autocomplete])"
  );

  const detected: DetectedQuestion[] = [];
  let index = 0;

  for (const el of Array.from(elements)) {
    // Skip Workit elements
    if (el.closest("#workit-root")) continue;

    // Skip invisible/disabled
    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      el.disabled
    ) {
      continue;
    }

    const signals = extractFieldSignals(el);
    const classification = classifyField(signals);

    // If it's a standard single-value profile field, skip it
    if (STANDARD_PROFILE_TYPES.has(classification.semanticType)) {
      continue;
    }

    // Get question prompt from label, aria, or placeholder
    let prompt = signals.labelText || signals.ariaLabel || signals.placeholder;
    if (!prompt) continue;

    // Strip trailing required asterisks and punctuation for cleaner question matching
    prompt = prompt.replace(/\s*\*\s*$/, "").replace(/[:?]+\s*$/, "?").trim();

    if (prompt.length < 5) continue;

    const fieldId = el.id || el.getAttribute("name") || `q_field_${index++}`;
    detected.push({
      element: el,
      fieldId,
      questionText: prompt,
    });
  }

  return detected;
}
