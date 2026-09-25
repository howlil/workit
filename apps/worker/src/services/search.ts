import type {
  D1OpportunityRepository,
  D1AnswerMemoryRepository,
  D1ProfileRepository,
} from "@workit/db";
import type { SearchResultItem, GlobalSearchResponse } from "@workit/contracts";

export class SearchService {
  constructor(
    private oppRepo: D1OpportunityRepository,
    private ansRepo: D1AnswerMemoryRepository,
    private profileRepo: D1ProfileRepository
  ) {}

  async search(userId: string, query: string): Promise<GlobalSearchResponse> {
    const q = query.trim().toLowerCase();
    if (!q) {
      return { query, results: [] };
    }

    const results: SearchResultItem[] = [];

    // 1. Search Opportunities
    const opps = await this.oppRepo.list(userId);
    for (const opp of opps) {
      const matchTitle = opp.title.toLowerCase().includes(q);
      const matchCompany = opp.company.toLowerCase().includes(q);
      const matchLocation = opp.location?.toLowerCase().includes(q);
      const matchState = opp.state.toLowerCase().includes(q);

      if (matchTitle || matchCompany || matchLocation || matchState) {
        results.push({
          id: opp.id,
          type: "opportunity",
          title: opp.title,
          subtitle: `${opp.company}${opp.location ? ` • ${opp.location}` : ""} (${opp.state})`,
          metadata: { state: opp.state, company: opp.company },
        });
      }
    }

    // 2. Search Answers
    const answers = await this.ansRepo.list(userId);
    for (const ans of answers) {
      const matchQ = ans.questionText.toLowerCase().includes(q);
      const matchA = ans.answerText.toLowerCase().includes(q);
      const matchCat = ans.category?.toLowerCase().includes(q);

      if (matchQ || matchA || matchCat) {
        results.push({
          id: ans.id,
          type: "answer",
          title: ans.questionText,
          subtitle: ans.category ? `Category: ${ans.category}` : "Answer Memory",
          snippet: ans.answerText.length > 80 ? `${ans.answerText.slice(0, 80)}...` : ans.answerText,
        });
      }
    }

    // 3. Search Career Profile
    const fullProfile = await this.profileRepo.getOrCreateProfile(userId);
    const { profile, experiences, skills } = fullProfile;

    // Check identity
    if (profile.fullName.toLowerCase().includes(q) || profile.summary?.toLowerCase().includes(q)) {
      results.push({
        id: profile.id,
        type: "profile",
        title: profile.fullName,
        subtitle: "Profile Identity & Summary",
        snippet: profile.summary,
      });
    }

    // Check experiences & facts
    for (const exp of experiences) {
      const matchExp =
        exp.company.toLowerCase().includes(q) ||
        exp.title.toLowerCase().includes(q) ||
        exp.facts.some((f) => f.factText.toLowerCase().includes(q));

      if (matchExp) {
        const matchingFact = exp.facts.find((f) => f.factText.toLowerCase().includes(q));
        results.push({
          id: exp.id,
          type: "profile",
          title: `${exp.title} at ${exp.company}`,
          subtitle: `Experience (${exp.startDate} - ${exp.isCurrent ? "Present" : exp.endDate || ""})`,
          snippet: matchingFact ? matchingFact.factText : exp.description,
        });
      }
    }

    // Check skills
    const matchingSkills = skills.filter((s) => s.name.toLowerCase().includes(q));
    if (matchingSkills.length > 0) {
      results.push({
        id: "profile_skills",
        type: "profile",
        title: `Skills: ${matchingSkills.map((s) => s.name).join(", ")}`,
        subtitle: `${matchingSkills.length} matching skill${matchingSkills.length > 1 ? "s" : ""}`,
      });
    }

    return {
      query,
      results,
    };
  }
}
