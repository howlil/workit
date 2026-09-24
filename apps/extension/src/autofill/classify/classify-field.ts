import type { FieldSignals, SemanticFieldType, FieldConfidenceState } from "../types";

interface TypeScore {
  type: SemanticFieldType;
  score: number;
}

export function classifyField(signals: FieldSignals): {
  semanticType: SemanticFieldType;
  confidence: number;
  state: FieldConfidenceState;
} {
  // If hidden, password, submit, button, unsupported
  if (
    signals.type === "hidden" ||
    signals.type === "password" ||
    signals.type === "submit" ||
    signals.type === "button"
  ) {
    return {
      semanticType: "unknown",
      confidence: 0,
      state: "unsupported",
    };
  }

  // Helper matching tests
  const textMatches = (...keywords: string[]): boolean => {
    const haystack = `${signals.labelText} ${signals.name} ${signals.id} ${signals.ariaLabel} ${signals.placeholder}`.toLowerCase();
    return keywords.some((k) => haystack.includes(k.toLowerCase()));
  };

  // Special handling for file inputs (Resume / CV)
  if (signals.type === "file") {
    if (textMatches("resume", "cv", "curriculum", "curriculum vitae", "attach", "upload")) {
      return {
        semanticType: "resume",
        confidence: 0.95,
        state: "ready",
      };
    }
    return {
      semanticType: "unknown",
      confidence: 0,
      state: "unsupported",
    };
  }

  const scores: TypeScore[] = [];


  // 1. Email
  let emailScore = 0;
  if (signals.autocomplete === "email") emailScore = 1.0;
  else if (signals.type === "email") emailScore += 0.9;
  else {
    if (signals.labelText.includes("email")) emailScore += 0.8;
    if (signals.name.includes("email") || signals.id.includes("email")) emailScore += 0.6;
    if (signals.placeholder.includes("email") || signals.placeholder.includes("@")) emailScore += 0.3;
  }
  if (emailScore > 0) scores.push({ type: "email", score: Math.min(emailScore, 1.0) });

  // 2. Phone
  let phoneScore = 0;
  if (signals.autocomplete === "tel" || signals.autocomplete === "tel-national") phoneScore = 1.0;
  else if (signals.type === "tel") phoneScore += 0.9;
  else {
    if (textMatches("phone", "mobile", "telephone", "cell")) phoneScore += 0.8;
    if (signals.name.includes("phone") || signals.id.includes("phone") || signals.id.includes("tel")) phoneScore += 0.6;
    if (signals.placeholder.includes("555") || signals.placeholder.includes("phone")) phoneScore += 0.3;
  }
  if (phoneScore > 0) scores.push({ type: "phone", score: Math.min(phoneScore, 1.0) });

  // 3. Full Name
  let fullNameScore = 0;
  if (signals.autocomplete === "name") fullNameScore = 1.0;
  else {
    if (
      signals.labelText.includes("full name") ||
      signals.labelText.includes("applicant name") ||
      signals.labelText.includes("candidate name") ||
      signals.labelText.includes("your name")
    ) {
      fullNameScore += 0.9;
    } else if (
      signals.labelText.startsWith("name") ||
      signals.labelText === "name *" ||
      signals.labelText === "name"
    ) {
      fullNameScore += 0.8;
    }
    if (
      signals.name.includes("fullname") ||
      signals.name.includes("full_name") ||
      signals.id.includes("fullname") ||
      signals.id.includes("applicant-name")
    ) {
      fullNameScore += 0.7;
    }
    if (signals.placeholder.includes("jane doe") || signals.placeholder.includes("full name")) {
      fullNameScore += 0.4;
    }
  }
  if (fullNameScore > 0) scores.push({ type: "full_name", score: Math.min(fullNameScore, 1.0) });

  // 4. First Name
  let firstNameScore = 0;
  if (signals.autocomplete === "given-name") firstNameScore = 1.0;
  else if (textMatches("first name", "given name", "firstname", "fname")) {
    firstNameScore += 0.85;
  }
  if (firstNameScore > 0) scores.push({ type: "first_name", score: Math.min(firstNameScore, 1.0) });

  // 5. Last Name
  let lastNameScore = 0;
  if (signals.autocomplete === "family-name") lastNameScore = 1.0;
  else if (textMatches("last name", "surname", "family name", "lastname", "lname")) {
    lastNameScore += 0.85;
  }
  if (lastNameScore > 0) scores.push({ type: "last_name", score: Math.min(lastNameScore, 1.0) });

  // 6. Location
  let locationScore = 0;
  if (signals.autocomplete.includes("address-level") || signals.autocomplete === "country-name") locationScore = 0.9;
  else {
    if (textMatches("location", "city", "address", "current city")) locationScore += 0.8;
    if (signals.name.includes("location") || signals.id.includes("location")) locationScore += 0.6;
    if (signals.placeholder.includes("city") || signals.placeholder.includes("country")) locationScore += 0.3;
  }
  if (locationScore > 0) scores.push({ type: "location", score: Math.min(locationScore, 1.0) });

  // 7. LinkedIn
  let linkedinScore = 0;
  if (textMatches("linkedin")) linkedinScore += 0.9;
  if (signals.placeholder.includes("linkedin.com")) linkedinScore += 0.8;
  if (signals.name.includes("linkedin") || signals.id.includes("linkedin")) linkedinScore += 0.8;
  if (linkedinScore > 0) scores.push({ type: "linkedin", score: Math.min(linkedinScore, 1.0) });

  // 8. GitHub
  let githubScore = 0;
  if (textMatches("github")) githubScore += 0.9;
  if (signals.placeholder.includes("github.com")) githubScore += 0.8;
  if (githubScore > 0) scores.push({ type: "github", score: Math.min(githubScore, 1.0) });

  // 9. Portfolio
  let portfolioScore = 0;
  if (textMatches("portfolio", "personal website", "personal site", "website", "blog")) {
    portfolioScore += 0.85;
  }
  if (signals.name.includes("portfolio") || signals.id.includes("portfolio")) portfolioScore += 0.7;
  if (signals.placeholder.includes("portfolio") || signals.placeholder.includes("yourportfolio.com")) {
    portfolioScore += 0.4;
  }
  if (portfolioScore > 0) scores.push({ type: "portfolio", score: Math.min(portfolioScore, 1.0) });

  // 10. Summary / Cover note
  let summaryScore = 0;
  if (signals.tag === "textarea") {
    if (textMatches("summary", "cover", "note", "about", "bio", "yourself")) {
      summaryScore += 0.85;
    }
  } else if (textMatches("summary", "bio", "about you")) {
    summaryScore += 0.6;
  }
  if (summaryScore > 0) scores.push({ type: "summary", score: Math.min(summaryScore, 1.0) });

  if (scores.length === 0) {
    return {
      semanticType: "unknown",
      confidence: 0,
      state: "unsupported",
    };
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  if (!best) {
    return {
      semanticType: "unknown",
      confidence: 0,
      state: "unsupported",
    };
  }

  let state: FieldConfidenceState = "unsupported";
  if (best.score >= 0.7) {
    state = "ready";
  } else if (best.score >= 0.4) {
    state = "needs_review";
  }

  return {
    semanticType: best.type,
    confidence: Number(best.score.toFixed(2)),
    state,
  };
}
