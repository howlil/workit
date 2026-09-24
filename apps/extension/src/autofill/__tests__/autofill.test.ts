import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { extractFieldSignals } from "../detect/signals";
import { classifyField } from "../classify/classify-field";
import { resolveProfileValue } from "../resolve/profile-value-resolver";
import { writeTextInput } from "../write/text-input-writer";
import { verifyFieldValue } from "../verify/verify-field";
import { autofillEngine } from "../autofill-engine";
import type { FullCareerProfile } from "@workit/contracts";

describe("S6 — Basic Autofill Pipeline", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  const mockProfile: FullCareerProfile = {
    profile: {
      id: "prof_1",
      userId: "usr_1",
      fullName: "Jane Doe",
      email: "jane.doe@workit.dev",
      phone: "+1 555-0100",
      location: "Jakarta, Indonesia",
      linkedinUrl: "https://linkedin.com/in/janedoe",
      portfolioUrl: "https://janedoe.dev",
      githubUrl: "https://github.com/janedoe",
      summary: "Experienced software engineer specializing in web applications.",
      createdAt: "2026-09-25T00:00:00Z",
      updatedAt: "2026-09-25T00:00:00Z",
    },
    experiences: [],
    education: [],
    skills: [],
  };

  describe("Signals & Classification", () => {
    it("extracts signals and classifies email field with high confidence", () => {
      container.innerHTML = `
        <label for="user-email">Email Address *</label>
        <input id="user-email" type="email" autocomplete="email" placeholder="you@domain.com" />
      `;
      const input = container.querySelector<HTMLInputElement>("input")!;
      const signals = extractFieldSignals(input);

      expect(signals.type).toBe("email");
      expect(signals.autocomplete).toBe("email");
      expect(signals.labelText).toContain("email address");

      const classification = classifyField(signals);
      expect(classification.semanticType).toBe("email");
      expect(classification.confidence).toBeGreaterThanOrEqual(0.7);
      expect(classification.state).toBe("ready");
    });

    it("classifies full name from label and autocomplete", () => {
      container.innerHTML = `
        <label for="applicant-name">Full Name *</label>
        <input id="applicant-name" type="text" autocomplete="name" />
      `;
      const input = container.querySelector<HTMLInputElement>("input")!;
      const signals = extractFieldSignals(input);
      const classification = classifyField(signals);

      expect(classification.semanticType).toBe("full_name");
      expect(classification.state).toBe("ready");
    });

    it("classifies phone input from tel type and autocomplete", () => {
      container.innerHTML = `
        <label for="phone-num">Mobile Phone</label>
        <input id="phone-num" type="tel" autocomplete="tel" />
      `;
      const input = container.querySelector<HTMLInputElement>("input")!;
      const classification = classifyField(extractFieldSignals(input));

      expect(classification.semanticType).toBe("phone");
      expect(classification.state).toBe("ready");
    });

    it("classifies linkedin URL input from name and placeholder", () => {
      container.innerHTML = `
        <label for="linkedin">LinkedIn Profile</label>
        <input id="linkedin" name="linkedin_url" placeholder="https://linkedin.com/in/..." />
      `;
      const input = container.querySelector<HTMLInputElement>("input")!;
      const classification = classifyField(extractFieldSignals(input));

      expect(classification.semanticType).toBe("linkedin");
      expect(classification.state).toBe("ready");
    });

    it("marks completely unknown fields as unsupported", () => {
      container.innerHTML = `
        <label for="misc">Internal Referral Code</label>
        <input id="misc" name="refcode" />
      `;
      const input = container.querySelector<HTMLInputElement>("input")!;
      const classification = classifyField(extractFieldSignals(input));

      expect(classification.semanticType).toBe("unknown");
      expect(classification.state).toBe("unsupported");
    });
  });

  describe("Value Resolution", () => {
    it("resolves canonical profile values for each semantic type", () => {
      expect(resolveProfileValue("full_name", mockProfile)).toBe("Jane Doe");
      expect(resolveProfileValue("first_name", mockProfile)).toBe("Jane");
      expect(resolveProfileValue("last_name", mockProfile)).toBe("Doe");
      expect(resolveProfileValue("email", mockProfile)).toBe("jane.doe@workit.dev");
      expect(resolveProfileValue("phone", mockProfile)).toBe("+1 555-0100");
      expect(resolveProfileValue("location", mockProfile)).toBe("Jakarta, Indonesia");
      expect(resolveProfileValue("linkedin", mockProfile)).toBe("https://linkedin.com/in/janedoe");
      expect(resolveProfileValue("portfolio", mockProfile)).toBe("https://janedoe.dev");
      expect(resolveProfileValue("summary", mockProfile)).toContain("Experienced software engineer");
    });
  });

  describe("DOM Writer & Verification", () => {
    it("writes value, dispatches input and change events, and verifies DOM value", async () => {
      container.innerHTML = `<input id="test-input" type="text" />`;
      const input = container.querySelector<HTMLInputElement>("input")!;

      let inputDispatched = false;
      let changeDispatched = false;
      input.addEventListener("input", () => {
        inputDispatched = true;
      });
      input.addEventListener("change", () => {
        changeDispatched = true;
      });

      writeTextInput(input, "Jane Doe");

      expect(input.value).toBe("Jane Doe");
      expect(inputDispatched).toBe(true);
      expect(changeDispatched).toBe(true);

      const verified = await verifyFieldValue(input, "Jane Doe");
      expect(verified).toBe(true);
    });
  });

  describe("AutofillEngine End-to-End", () => {
    it("scans container, creates plan with ready items, and executes verified fill", async () => {
      container.innerHTML = `
        <form>
          <div>
            <label for="name">Full Name</label>
            <input id="name" type="text" autocomplete="name" />
          </div>
          <div>
            <label for="email">Email</label>
            <input id="email" type="email" autocomplete="email" />
          </div>
          <div>
            <label for="location">Location / City</label>
            <input id="location" type="text" />
          </div>
        </form>
      `;

      const plan = autofillEngine.createPlan(mockProfile, container);
      expect(plan.readyCount).toBe(3);
      expect(plan.items.length).toBe(3);

      const stats = await autofillEngine.executePlan(plan);
      expect(stats.total).toBe(3);
      expect(stats.filled).toBe(3);
      expect(stats.failed).toBe(0);

      // Verify DOM inputs actually hold values
      const nameInput = container.querySelector<HTMLInputElement>("#name")!;
      const emailInput = container.querySelector<HTMLInputElement>("#email")!;
      const locationInput = container.querySelector<HTMLInputElement>("#location")!;

      expect(nameInput.value).toBe("Jane Doe");
      expect(emailInput.value).toBe("jane.doe@workit.dev");
      expect(locationInput.value).toBe("Jakarta, Indonesia");
    });
  });
});
