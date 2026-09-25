import type { McpServices, ToolCallResult } from "./types.js";
import type { JobCandidate, OpportunityState, SearchResultType } from "@workit/contracts";

export async function executeMcpTool(
  toolName: string,
  args: Record<string, any> | undefined,
  services: McpServices,
  userId: string
): Promise<ToolCallResult> {
  const safeArgs = args || {};

  try {
    switch (toolName) {
      case "search_opportunities": {
        const query = typeof safeArgs.query === "string" ? safeArgs.query : undefined;
        const state = typeof safeArgs.state === "string" ? (safeArgs.state as OpportunityState) : undefined;
        const limit = typeof safeArgs.limit === "number" ? safeArgs.limit : 20;

        const results = await services.searchOpportunities(userId, { query, state, limit });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: results.length,
                  opportunities: results,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_opportunity": {
        const id = safeArgs.id;
        if (!id || typeof id !== "string") {
          return {
            content: [{ type: "text", text: "Error: Missing required argument 'id'" }],
            isError: true,
          };
        }

        const detail = await services.getOpportunity(userId, id);
        if (!detail) {
          return {
            content: [{ type: "text", text: `Opportunity '${id}' not found.` }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(detail, null, 2),
            },
          ],
        };
      }

      case "save_opportunity": {
        const { url, title, company, descriptionText, location, workArrangement, employmentType, provider, sourceJobId } = safeArgs;
        if (!url || !title || !company || !descriptionText) {
          return {
            content: [
              {
                type: "text",
                text: "Error: Missing required arguments. 'url', 'title', 'company', and 'descriptionText' are required.",
              },
            ],
            isError: true,
          };
        }

        const candidate: JobCandidate = {
          source: {
            canonicalUrl: url,
            provider: provider || "manual",
            sourceJobId,
          },
          title,
          company,
          location,
          workArrangement: workArrangement || "unknown",
          employmentType,
          descriptionText,
          extractedAt: new Date().toISOString(),
          extraction: {
            strategy: "generic",
            confidence: 1.0,
          },
        };

        const result = await services.saveOpportunity(userId, candidate);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: result.isDuplicate
                    ? "Existing opportunity found (duplicate detected)."
                    : "Opportunity captured and persisted successfully.",
                  ...result,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_career_profile": {
        const section = safeArgs.section || "all";
        const fullProfile = await services.getCareerProfile(userId);

        let data: any = fullProfile;
        if (section === "identity") {
          data = fullProfile.profile;
        } else if (section === "experiences") {
          data = fullProfile.experiences;
        } else if (section === "education") {
          data = fullProfile.education;
        } else if (section === "skills") {
          data = fullProfile.skills;
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "search_answers": {
        const question = safeArgs.question;
        if (!question || typeof question !== "string") {
          return {
            content: [{ type: "text", text: "Error: Missing required argument 'question'" }],
            isError: true,
          };
        }

        const match = await services.findAnswerMatch(userId, question);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query: question,
                  hasMatch: Boolean(match),
                  bestMatch: match,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "save_answer": {
        const { questionText, answerText, category } = safeArgs;
        if (!questionText || !answerText) {
          return {
            content: [
              {
                type: "text",
                text: "Error: 'questionText' and 'answerText' are required arguments.",
              },
            ],
            isError: true,
          };
        }

        const saved = await services.saveAnswer(userId, { questionText, answerText, category });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: "Answer memory saved successfully.",
                  answer: saved,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "match_job_evidence": {
        const jobDescription = safeArgs.jobDescription;
        if (!jobDescription || typeof jobDescription !== "string") {
          return {
            content: [
              {
                type: "text",
                text: "Error: Missing required argument 'jobDescription'",
              },
            ],
            isError: true,
          };
        }

        const analysis = await services.matchJobEvidence(userId, jobDescription);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  overallScore: analysis.overallScore,
                  matchedCount: analysis.matchedCount,
                  partialCount: analysis.partialCount,
                  missingCount: analysis.missingCount,
                  totalRequirements: analysis.totalRequirements,
                  matches: analysis.matches,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "search_global": {
        const query = safeArgs.query;
        if (!query || typeof query !== "string") {
          return {
            content: [{ type: "text", text: "Error: Missing required argument 'query'" }],
            isError: true,
          };
        }

        const scope = (safeArgs.scope as SearchResultType | "all") || "all";
        const results = await services.searchGlobal(userId, query, scope);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query,
                  scope,
                  count: results.length,
                  results,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
          isError: true,
        };
    }
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error executing tool '${toolName}': ${err?.message || String(err)}` }],
      isError: true,
    };
  }
}
