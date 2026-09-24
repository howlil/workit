import type {
  ResumeDraftProfile,
  ResumeIdentityDraft,
  ResumeExperienceDraft,
  ResumeEducationDraft,
} from "./types.js";

const SECTION_HEADERS: Record<string, "summary" | "experience" | "education" | "skills"> = {
  "summary": "summary",
  "professional summary": "summary",
  "about": "summary",
  "about me": "summary",
  "objective": "summary",
  "experience": "experience",
  "work experience": "experience",
  "employment history": "experience",
  "professional experience": "experience",
  "work history": "experience",
  "education": "education",
  "academic history": "education",
  "academic background": "education",
  "skills": "skills",
  "technical skills": "skills",
  "skills & technologies": "skills",
  "core competencies": "skills",
  "technologies": "skills",
};

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i;
const GITHUB_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i;
const PORTFOLIO_REGEX = /(?:https?:\/\/)?(?:www\.)?(?!linkedin\.com|github\.com)[a-zA-Z0-9-]+\.(?:com|org|io|dev|me|net)(?:\/[^\s]*)?/i;

const MONTH_NAMES = "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
const DATE_PART = `(?:(?:${MONTH_NAMES})\\s+\\d{4}|(?:${MONTH_NAMES})|\\d{1,2}\\/\\d{2,4}|\\d{4})`;
const DATE_RANGE_REGEX = new RegExp(`(${DATE_PART})\\s*(?:-|–|to)\\s*(Present|Current|Now|${DATE_PART})`, "i");

export function parseResume(rawText: string): ResumeDraftProfile {

  const lines = rawText.split(/\r?\n/).map((l) => l.trim());
  const identity = extractIdentity(lines, rawText);
  const sections = splitIntoSections(lines);

  const summary = sections.summary.join(" ").trim();
  if (summary && !identity.summary) {
    identity.summary = summary;
  }

  const experiences = parseExperiences(sections.experience);
  const education = parseEducation(sections.education);
  const skills = parseSkills(sections.skills);

  return {
    identity,
    experiences,
    education,
    skills,
  };
}

function extractIdentity(lines: string[], rawText: string): ResumeIdentityDraft {
  const identity: ResumeIdentityDraft = {};

  const emailMatch = rawText.match(EMAIL_REGEX);
  if (emailMatch) {
    identity.email = emailMatch[0];
  }

  const phoneMatch = rawText.match(PHONE_REGEX);
  if (phoneMatch) {
    identity.phone = phoneMatch[0].trim();
  }

  const linkedinMatch = rawText.match(LINKEDIN_REGEX);
  if (linkedinMatch) {
    identity.linkedinUrl = linkedinMatch[0].startsWith("http")
      ? linkedinMatch[0]
      : `https://${linkedinMatch[0]}`;
  }

  const githubMatch = rawText.match(GITHUB_REGEX);
  if (githubMatch) {
    identity.githubUrl = githubMatch[0].startsWith("http")
      ? githubMatch[0]
      : `https://${githubMatch[0]}`;
  }

  const portfolioMatch = rawText.match(PORTFOLIO_REGEX);
  if (portfolioMatch) {
    identity.portfolioUrl = portfolioMatch[0].startsWith("http")
      ? portfolioMatch[0]
      : `https://${portfolioMatch[0]}`;
  }

  // Name extraction: first non-empty line before section headers that doesn't contain email/urls
  for (const line of lines.slice(0, 5)) {
    if (!line) continue;
    const lower = line.toLowerCase().replace(/[:#]/g, "").trim();
    if (SECTION_HEADERS[lower]) break;
    if (line.includes("@") || line.includes("http") || line.includes(".com")) continue;
    // Check if line looks like a name (2-4 words, starts with letters)
    if (/^[A-Za-z\s.'-]{2,40}$/.test(line) && line.split(/\s+/).length <= 5) {
      identity.fullName = line.trim();
      break;
    }
  }

  // Location heuristics (e.g., "San Francisco, CA" or "New York, NY, USA")
  const locationRegex = /\b([A-Z][a-zA-Z\s]+,\s*[A-Z]{2}(?:\s+\d{5})?|[A-Z][a-zA-Z\s]+,\s*[A-Z][a-zA-Z\s]+)\b/;
  for (const line of lines.slice(0, 8)) {
    if (!line) continue;
    if (line.includes("@") || line.includes("http")) {
      const match = line.match(locationRegex);
      if (match && match[1]) {
        identity.location = match[1].trim();
        break;
      }
    } else {
      const match = line.match(locationRegex);
      if (match && match[1] && !identity.fullName?.includes(match[1])) {
        identity.location = match[1].trim();
        break;
      }
    }
  }

  return identity;
}

interface ParsedSections {
  summary: string[];
  experience: string[];
  education: string[];
  skills: string[];
}

function splitIntoSections(lines: string[]): ParsedSections {
  const sections: ParsedSections = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
  };

  let currentSection: "summary" | "experience" | "education" | "skills" | null = null;

  for (const line of lines) {
    if (!line) continue;
    const cleaned = line.replace(/^[#*=-]+\s*/, "").replace(/[:]+$/, "").toLowerCase().trim();
    const matchedHeader = SECTION_HEADERS[cleaned];

    if (matchedHeader) {
      currentSection = matchedHeader;
      continue;
    }

    if (currentSection) {
      sections[currentSection].push(line);
    }
  }

  return sections;
}

function parseExperiences(lines: string[]): ResumeExperienceDraft[] {
  const experiences: ResumeExperienceDraft[] = [];
  let current: Partial<ResumeExperienceDraft> & { factsList: string[] } | null = null;
  let pendingHeaderLine: string | null = null;

  function commitCurrent() {
    if (current && (current.company || current.title)) {
      experiences.push({
        company: current.company || "Unknown Company",
        title: current.title || "Role",
        location: current.location,
        startDate: current.startDate || "2020",
        endDate: current.endDate,
        isCurrent: current.isCurrent ?? false,
        description: current.description,
        facts: current.factsList.length > 0 ? current.factsList : undefined,
      });
    }
    current = null;
  }

  function parseHeaderLine(line: string): { title: string; company: string; location?: string } {
    let title = "Role";
    let company = "Company";
    let location: string | undefined;

    const atSplit = line.split(/\s+(?:at|@)\s+/i);
    if (atSplit.length === 2 && atSplit[0] && atSplit[1]) {
      title = atSplit[0].trim();
      const compLoc = atSplit[1].split(/\s*[,|–-]\s*/);
      company = compLoc[0]?.trim() || atSplit[1].trim();
      if (compLoc[1]) location = compLoc[1].trim();
    } else {
      const parts = line.split(/\s*[,|–-]\s*/).filter(Boolean);
      if (parts.length >= 2 && parts[0] && parts[1]) {
        title = parts[0].trim();
        company = parts[1].trim();
        if (parts[2]) location = parts[2].trim();
      } else if (parts.length === 1 && parts[0]) {
        title = parts[0].trim();
      }
    }
    return { title, company, location };
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine?.trim();
    if (!line) continue;

    const dateMatch = line.match(DATE_RANGE_REGEX);
    const isBullet = /^[•\-*]\s+/.test(line);

    if (dateMatch && !isBullet) {
      commitCurrent();

      const isCurrent = /present|current|now/i.test(dateMatch[2] ?? "");
      const startDate = dateMatch[1]?.trim() || "2020";
      const endDate = isCurrent ? undefined : dateMatch[2]?.trim();

      const lineWithoutDate = line.replace(dateMatch[0], "").replace(/[()|•–-]/g, " ").trim();

      const headerToParse = pendingHeaderLine || lineWithoutDate;
      pendingHeaderLine = null;

      const { title, company, location } = parseHeaderLine(headerToParse || "Role at Company");


      current = {
        title,
        company,
        location,
        startDate,
        endDate,
        isCurrent,
        factsList: [],
      };
    } else if (isBullet && current) {
      const fact = line.replace(/^[•\-*]\s+/, "").trim();
      if (fact) {
        current.factsList.push(fact);
      }
    } else if (!isBullet) {
      pendingHeaderLine = line;
      if (current && !current.description) {
        current.description = line;
      }
    }
  }

  commitCurrent();
  return experiences;
}

function parseEducation(lines: string[]): ResumeEducationDraft[] {
  const education: ResumeEducationDraft[] = [];
  let current: Partial<ResumeEducationDraft> | null = null;

  function commitCurrent() {
    if (current && current.institution) {
      education.push({
        institution: current.institution,
        degree: current.degree,
        fieldOfStudy: current.fieldOfStudy,
        startDate: current.startDate,
        endDate: current.endDate,
      });
    }
    current = null;
  }

  for (const line of lines) {
    if (!line) continue;
    const dateMatch = line.match(DATE_RANGE_REGEX);

    if (dateMatch && current) {
      current.startDate = dateMatch[1]?.trim();
      current.endDate = dateMatch[2]?.trim();
      continue;
    }

    const parts = line.split(/\s*(?:[-–|]|\bat\b)\s*/).filter(Boolean);
    const degreeRegex = /\b(Bachelor|Master|Doctor|Ph\.?D|Associate|B\.?S|M\.?S|B\.?A|M\.?A)\b/i;

    if (parts.length >= 2) {
      commitCurrent();
      let degree: string | undefined;
      let fieldOfStudy: string | undefined;
      let institution = "University";

      if (parts[0] && degreeRegex.test(parts[0])) {
        degree = parts[0].trim();
        institution = parts.slice(1).join(" - ").trim();
      } else if (parts[1] && degreeRegex.test(parts[1])) {
        institution = parts[0]?.trim() || "University";
        degree = parts.slice(1).join(" - ").trim();
      } else {
        institution = parts[0]?.trim() || "University";
        fieldOfStudy = parts[1]?.trim();
      }

      if (degree && degree.toLowerCase().includes(" in ")) {
        const inParts = degree.split(/\s+in\s+/i);
        degree = inParts[0]?.trim();
        fieldOfStudy = inParts[1]?.trim();
      }

      current = {
        institution,
        degree,
        fieldOfStudy,
        startDate: dateMatch ? dateMatch[1]?.trim() : undefined,
        endDate: dateMatch ? dateMatch[2]?.trim() : undefined,
      };
    } else {
      if (!current) {
        current = { institution: line.trim() };
      } else if (!current.degree && degreeRegex.test(line)) {
        current.degree = line.trim();
      } else if (!current.fieldOfStudy) {
        current.fieldOfStudy = line.trim();
      }
    }
  }

  commitCurrent();
  return education;
}


function parseSkills(lines: string[]): string[] {
  const skillSet = new Set<string>();

  for (const line of lines) {
    if (!line) continue;
    // Strip categories like "Languages: JavaScript, TypeScript"
    const cleaned = line.replace(/^[A-Za-z\s]+:\s*/, "").replace(/^[•\-*]\s*/, "");
    const parts = cleaned.split(/[,|;/•]\s*/).map((s) => s.trim()).filter((s) => s.length > 0);
    for (const part of parts) {
      if (part.length <= 40 && !part.includes("http")) {
        skillSet.add(part);
      }
    }
  }

  return Array.from(skillSet);
}
