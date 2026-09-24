import { describe, it, expect, beforeEach } from "vitest";
import { classifyField } from "../classify/classify-field";
import { resolveProfileValue, generateResumeDocument } from "../resolve/profile-value-resolver";
import { writeFileInput } from "../write/file-input-writer";
import { verifyFieldValue } from "../verify/verify-field";
import { autofillEngine } from "../autofill-engine";
import type { FullCareerProfile } from "@workit/contracts";

describe("S11 — Resume Autofill (File Input Support)", () => {
  const dummyProfile: FullCareerProfile = {
    profile: {
      id: "prof_test",
      userId: "usr_test",
      fullName: "Jordan Lee",
      email: "jordan@example.com",
      phone: "+1 555-0144",
      location: "Austin, TX",
      linkedinUrl: "https://linkedin.com/in/jordanlee",
      portfolioUrl: "https://jordanlee.dev",
      summary: "Staff Engineer specializing in scalable cloud infrastructures.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    experiences: [
      {
        id: "exp_1",
        profileId: "prof_test",
        company: "CloudVenture",
        title: "Principal Engineer",
        startDate: "2021",
        isCurrent: true,
        facts: [
          {
            id: "fact_1",
            experienceId: "exp_1",
            factText: "Designed streaming pipeline with Kafka",
          },
        ],
      },
    ],
    education: [
      {
        id: "edu_1",
        profileId: "prof_test",
        institution: "UT Austin",
        degree: "B.S.",
        fieldOfStudy: "Computer Science",
      },
    ],
    skills: [{ id: "skl_1", profileId: "prof_test", name: "TypeScript" }],
  };

  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("classifies file input with resume label as semanticType: 'resume' and state: 'ready'", () => {
    const classification = classifyField({
      tag: "input",
      type: "file",
      id: "resume-upload",
      name: "applicant_resume",
      autocomplete: "",
      placeholder: "",
      ariaLabel: "Upload your resume or CV",
      labelText: "Attach Resume / CV Document",
      nearbyText: "",
    });

    expect(classification.semanticType).toBe("resume");
    expect(classification.state).toBe("ready");
    expect(classification.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("resolves resume filename and generates formatted resume content from profile", () => {
    const resolvedName = resolveProfileValue("resume", dummyProfile);
    expect(resolvedName).toBe("Jordan_Lee_Resume.txt");

    const content = generateResumeDocument(dummyProfile);
    expect(content).toContain("Jordan Lee");
    expect(content).toContain("jordan@example.com");
    expect(content).toContain("CloudVenture");
    expect(content).toContain("Designed streaming pipeline with Kafka");
    expect(content).toContain("UT Austin");
    expect(content).toContain("TypeScript");
  });

  it("writes file to file input and passes post-write verification", async () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.name = "resume";
    document.body.appendChild(fileInput);

    let eventFired = false;
    fileInput.addEventListener("change", () => {
      eventFired = true;
    });

    writeFileInput(fileInput, {
      fileName: "Jordan_Lee_Resume.txt",
      content: "Resume content here...",
      mimeType: "text/plain",
    });

    expect(fileInput.files).not.toBeNull();
    expect(fileInput.files?.length).toBe(1);
    expect(fileInput.files?.[0]?.name).toBe("Jordan_Lee_Resume.txt");
    expect(eventFired).toBe(true);

    const verified = await verifyFieldValue(fileInput, "Jordan_Lee_Resume.txt");
    expect(verified).toBe(true);
  });

  it("integrates into AutofillEngine plan and executes file input fill end-to-end", async () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <form id="app-form">
        <label for="name-field">Full Name</label>
        <input id="name-field" name="fullName" type="text" />

        <label for="resume-field">Resume / CV</label>
        <input id="resume-field" name="resume" type="file" />
      </form>
    `;
    document.body.appendChild(container);

    const plan = autofillEngine.createPlan(dummyProfile, container);
    expect(plan.readyCount).toBe(2);

    const resumeItem = plan.items.find((i) => i.field.semanticType === "resume");
    expect(resumeItem).toBeDefined();
    expect(resumeItem?.resolvedValue).toBe("Jordan_Lee_Resume.txt");
    expect(resumeItem?.resolvedFile).toBeDefined();

    const result = await autofillEngine.executePlan(plan);
    expect(result.total).toBe(2);
    expect(result.filled).toBe(2);
    expect(result.failed).toBe(0);

    const fileInput = container.querySelector<HTMLInputElement>("#resume-field")!;
    expect(fileInput.files?.[0]?.name).toBe("Jordan_Lee_Resume.txt");
  });
});
