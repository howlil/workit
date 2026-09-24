import type { FullCareerProfile } from "../profile/types";
import type { JobRequirement, RequirementMatch, JobMatchAnalysis } from "./types";

export function matchRequirements(
  requirements: JobRequirement[],
  profile: FullCareerProfile
): JobMatchAnalysis {
  if (requirements.length === 0) {
    return {
      overallScore: 0,
      matchedCount: 0,
      partialCount: 0,
      missingCount: 0,
      totalRequirements: 0,
      matches: [],
    };
  }

  const matches: RequirementMatch[] = [];

  for (const req of requirements) {
    const evidenceFactIds: string[] = [];
    const evidenceSnippets: string[] = [];
    const reqLower = req.text.toLowerCase();
    const keywords = req.keywords.length > 0 ? req.keywords : [reqLower];

    // 1. Check Skills
    for (const skill of profile.skills || []) {
      const skillName = skill.name.toLowerCase();
      const isDirectMatch = keywords.some(
        (kw) => skillName === kw || reqLower.includes(skillName) || skillName.includes(kw)
      );

      if (isDirectMatch) {
        if (!evidenceFactIds.includes(skill.id)) {
          evidenceFactIds.push(skill.id);
          evidenceSnippets.push(`Skill: ${skill.name}`);
        }
      }
    }

    // 2. Check Experience & Experience Facts
    for (const exp of profile.experiences || []) {
      // Check granular facts first (highest quality evidence)
      for (const fact of exp.facts || []) {
        const factLower = fact.factText.toLowerCase();
        const hasKeyword = keywords.some((kw) => factLower.includes(kw));

        if (hasKeyword) {
          if (!evidenceFactIds.includes(fact.id)) {
            evidenceFactIds.push(fact.id);
            evidenceSnippets.push(`"${fact.factText}" at ${exp.company}`);
          }
        }
      }

      // Check experience title or description
      const expTitleLower = exp.title.toLowerCase();
      const expDescLower = (exp.description || "").toLowerCase();
      const matchesTitleOrDesc = keywords.some(
        (kw) => expTitleLower.includes(kw) || expDescLower.includes(kw)
      );

      if (matchesTitleOrDesc) {
        if (!evidenceFactIds.includes(exp.id)) {
          evidenceFactIds.push(exp.id);
          evidenceSnippets.push(`${exp.title} at ${exp.company}`);
        }
      }
    }

    // 3. Check Education
    if (req.type === "education" || reqLower.includes("degree") || reqLower.includes("computer science")) {
      for (const edu of profile.education || []) {
        const eduText = `${edu.degree || ""} ${edu.fieldOfStudy || ""} ${edu.institution}`.toLowerCase();
        const matchesEdu =
          eduText.includes("computer science") ||
          eduText.includes("engineering") ||
          keywords.some((kw) => eduText.includes(kw));

        if (matchesEdu) {
          if (!evidenceFactIds.includes(edu.id)) {
            evidenceFactIds.push(edu.id);
            evidenceSnippets.push(
              `${edu.degree || "Degree"} in ${edu.fieldOfStudy || "Engineering"} (${edu.institution})`
            );
          }
        }
      }
    }

    // Determine status & score
    // Invariant: Positive match MUST point to a valid evidence Fact ID
    if (evidenceFactIds.length > 0) {
      // If we matched multiple evidence items or a primary skill, it's a full match
      const hasSkill = (profile.skills || []).some((s) => evidenceFactIds.includes(s.id));
      const hasFact = (profile.experiences || []).some((e) =>
        (e.facts || []).some((f) => evidenceFactIds.includes(f.id))
      );
      const hasEdu = (profile.education || []).some((ed) => evidenceFactIds.includes(ed.id));

      if (hasSkill || hasFact || hasEdu) {
        matches.push({
          requirement: req.text,
          status: "matched",
          score: 1.0,
          evidenceFactIds,
          evidenceSummary: evidenceSnippets.join(" • "),
        });
      } else {
        matches.push({
          requirement: req.text,
          status: "partial",
          score: 0.5,
          evidenceFactIds,
          evidenceSummary: evidenceSnippets.join(" • "),
        });
      }
    } else {
      matches.push({
        requirement: req.text,
        status: "missing",
        score: 0.0,
        evidenceFactIds: [],
        evidenceSummary: "No matching evidence in career profile",
      });
    }
  }

  const matchedCount = matches.filter((m) => m.status === "matched").length;
  const partialCount = matches.filter((m) => m.status === "partial").length;
  const missingCount = matches.filter((m) => m.status === "missing").length;
  const totalRequirements = matches.length;

  const totalScore = matches.reduce((acc, m) => acc + m.score, 0);
  const overallScore = totalRequirements > 0 ? Math.round((totalScore / totalRequirements) * 100) : 0;

  return {
    overallScore,
    matchedCount,
    partialCount,
    missingCount,
    totalRequirements,
    matches,
  };
}
