import type { DetectedField } from "../types";
import { extractFieldSignals } from "./signals";
import { classifyField } from "../classify/classify-field";

export function scanFormFields(root: Document | HTMLElement = document): DetectedField[] {
  const elements = root.querySelectorAll<HTMLElement>(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea'
  );


  const detected: DetectedField[] = [];
  let index = 0;

  for (const el of Array.from(elements)) {
    // Crucial: Skip any elements within Workit UI (#workit-root)
    if (el.closest("#workit-root")) {
      continue;
    }

    // Skip invisible/disabled elements
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || (el as HTMLInputElement).disabled) {
      continue;
    }

    const signals = extractFieldSignals(el);
    const classification = classifyField(signals);

    // Only include fields that have recognized semantic types
    if (classification.semanticType !== "unknown") {
      const fieldId = el.id || el.getAttribute("name") || `field_${index++}`;

      detected.push({
        id: fieldId,
        element: el,
        signals,
        semanticType: classification.semanticType,
        confidence: classification.confidence,
        state: classification.state,
      });
    }
  }

  return detected;
}
