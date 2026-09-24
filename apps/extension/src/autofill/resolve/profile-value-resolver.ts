import type { FullCareerProfile } from "@workit/contracts";
import type { SemanticFieldType } from "../types";

export function resolveProfileValue(
  semanticType: SemanticFieldType,
  profileData: FullCareerProfile
): string {
  const { profile } = profileData;

  switch (semanticType) {
    case "full_name":
      return profile.fullName || "";

    case "first_name": {
      if (!profile.fullName) return "";
      const parts = profile.fullName.trim().split(/\s+/);
      return parts[0] || "";
    }

    case "last_name": {
      if (!profile.fullName) return "";
      const parts = profile.fullName.trim().split(/\s+/);
      return parts.length > 1 ? parts.slice(1).join(" ") : "";
    }

    case "email":
      return profile.email || "";

    case "phone":
      return profile.phone || "";

    case "location":
      return profile.location || "";

    case "linkedin":
      return profile.linkedinUrl || "";

    case "portfolio":
      return profile.portfolioUrl || "";

    case "github":
      return profile.githubUrl || "";

    case "summary":
      return profile.summary || "";

    case "resume": {
      const name = profile.fullName ? profile.fullName.trim().replace(/\s+/g, "_") : "Candidate";
      return `${name}_Resume.txt`;
    }

    default:
      return "";
  }
}

export function generateResumeDocument(profileData: FullCareerProfile): string {
  const { profile, experiences, education, skills } = profileData;
  const lines: string[] = [];

  lines.push(profile.fullName || "Candidate");
  const contact = [profile.location, profile.email, profile.phone].filter(Boolean).join(" | ");
  if (contact) lines.push(contact);
  const links = [profile.linkedinUrl, profile.githubUrl, profile.portfolioUrl].filter(Boolean).join(" | ");
  if (links) lines.push(links);
  lines.push("");

  if (profile.summary) {
    lines.push("SUMMARY");
    lines.push(profile.summary);
    lines.push("");
  }

  if (experiences.length > 0) {
    lines.push("EXPERIENCE");
    for (const exp of experiences) {
      const dates = `${exp.startDate} - ${exp.isCurrent ? "Present" : exp.endDate || "Present"}`;
      lines.push(`${exp.title} at ${exp.company} (${dates})`);
      if (exp.location) lines.push(exp.location);
      if (exp.facts && exp.facts.length > 0) {
        for (const f of exp.facts) {
          lines.push(`• ${f.factText}`);
        }
      } else if (exp.description) {
        lines.push(exp.description);
      }
      lines.push("");
    }
  }

  if (education.length > 0) {
    lines.push("EDUCATION");
    for (const edu of education) {
      const deg = [edu.degree, edu.fieldOfStudy].filter(Boolean).join(" in ");
      lines.push(`${deg ? `${deg} - ` : ""}${edu.institution}`);
      if (edu.startDate || edu.endDate) {
        lines.push(`${edu.startDate || ""} - ${edu.endDate || ""}`);
      }
      lines.push("");
    }
  }

  if (skills.length > 0) {
    lines.push("SKILLS");
    lines.push(skills.map((s) => s.name).join(", "));
  }

  return lines.join("\n").trim();
}

