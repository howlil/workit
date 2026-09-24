import type { FullCareerProfile } from "@workit/contracts";
import type { AutofillPlan, FieldFillPlanItem } from "./types";
import { scanFormFields } from "./detect/scan-form";
import { resolveProfileValue } from "./resolve/profile-value-resolver";
import { writeTextInput } from "./write/text-input-writer";
import { verifyFieldValue } from "./verify/verify-field";

export class AutofillEngine {
  createPlan(
    profile: FullCareerProfile,
    root: Document | HTMLElement = document
  ): AutofillPlan {
    const fields = scanFormFields(root);
    const items: FieldFillPlanItem[] = [];

    for (const field of fields) {
      const resolvedValue = resolveProfileValue(field.semanticType, profile);

      // Only propose fields for which the profile has a value
      if (resolvedValue && resolvedValue.trim().length > 0) {
        const approved = field.state === "ready";
        items.push({
          field,
          resolvedValue,
          approved,
          status: "pending",
        });
      }
    }

    const readyCount = items.filter((i) => i.approved).length;
    const reviewCount = items.filter((i) => !i.approved).length;

    return {
      items,
      readyCount,
      reviewCount,
    };
  }

  async executePlan(
    plan: AutofillPlan
  ): Promise<{ total: number; filled: number; failed: number }> {
    let filled = 0;
    let failed = 0;
    const itemsToFill = plan.items.filter((item) => item.approved);

    for (const item of itemsToFill) {
      const el = item.field.element;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        writeTextInput(el, item.resolvedValue);
        const verified = await verifyFieldValue(el, item.resolvedValue);

        if (verified) {
          item.status = "filled";
          filled++;
        } else {
          item.status = "verification_failed";
          failed++;
        }
      } else {
        item.status = "verification_failed";
        failed++;
      }
    }

    return {
      total: itemsToFill.length,
      filled,
      failed,
    };
  }
}

export const autofillEngine = new AutofillEngine();
