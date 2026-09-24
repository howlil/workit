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

    default:
      return "";
  }
}
