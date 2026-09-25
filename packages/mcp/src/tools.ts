import type { ToolDefinition } from "./types.js";

export const WORKIT_MCP_TOOLS: ToolDefinition[] = [
  {
    name: "search_opportunities",
    description:
      "Search captured job opportunities in Workit by query keywords (matching title, company) and/or state filter.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Keywords to match against title or company name",
        },
        state: {
          type: "string",
          enum: [
            "saved",
            "applying",
            "applied",
            "interviewing",
            "offered",
            "rejected",
            "archived",
          ],
          description: "Filter opportunities by application state",
        },
        limit: {
          type: "number",
          description: "Maximum number of opportunities to return (default 20)",
        },
      },
    },
  },
  {
    name: "get_opportunity",
    description:
      "Retrieve full details and captured job snapshot (including full job description and source URL) for an opportunity by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique opportunity ID (e.g. opp_...)",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "save_opportunity",
    description:
      "Capture and persist a job opportunity into Workit with duplicate detection and an immutable initial snapshot.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Canonical URL of the job posting",
        },
        title: {
          type: "string",
          description: "Job title (e.g. Senior Backend Engineer)",
        },
        company: {
          type: "string",
          description: "Hiring company name",
        },
        location: {
          type: "string",
          description: "Location or remote specification",
        },
        workArrangement: {
          type: "string",
          enum: ["remote", "hybrid", "onsite", "unknown"],
          description: "Work arrangement mode",
        },
        employmentType: {
          type: "string",
          description: "Employment type (e.g. Full-time, Contract)",
        },
        descriptionText: {
          type: "string",
          description: "Full text of the job description and requirements",
        },
        provider: {
          type: "string",
          description: "ATS or source provider (e.g. greenhouse, lever, linkedin, manual)",
        },
        sourceJobId: {
          type: "string",
          description: "External job ID if known",
        },
      },
      required: ["url", "title", "company", "descriptionText"],
    },
  },
  {
    name: "get_career_profile",
    description:
      "Retrieve the user's canonical career profile: personal contact details, work experiences, granular experience facts, education, and skills.",
    inputSchema: {
      type: "object",
      properties: {
        section: {
          type: "string",
          enum: ["all", "identity", "experiences", "education", "skills"],
          description: "Which profile section to retrieve (defaults to 'all')",
        },
      },
    },
  },
  {
    name: "search_answers",
    description:
      "Find reusable past application answers or Answer Memory items that best match an employer's application question.",
    inputSchema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The employer's question or prompt (e.g. 'Why do you want to join?')",
        },
      },
      required: ["question"],
    },
  },
  {
    name: "save_answer",
    description:
      "Save a high-quality reusable answer to the user's Answer Memory for future job applications.",
    inputSchema: {
      type: "object",
      properties: {
        questionText: {
          type: "string",
          description: "The prompt or question text",
        },
        answerText: {
          type: "string",
          description: "The response or essay answer text",
        },
        category: {
          type: "string",
          description: "Category tag (e.g. technical, leadership, behavioral, motivation)",
        },
      },
      required: ["questionText", "answerText"],
    },
  },
  {
    name: "match_job_evidence",
    description:
      "Analyze a job posting against the user's career profile facts and skills to determine requirement matches, gaps, and exact canonical evidence links.",
    inputSchema: {
      type: "object",
      properties: {
        jobDescription: {
          type: "string",
          description: "The full job description to analyze for requirements",
        },
      },
      required: ["jobDescription"],
    },
  },
  {
    name: "search_global",
    description:
      "Unified search across all Workit resources: opportunities, reusable answers, and profile skills/facts.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query keyword",
        },
        scope: {
          type: "string",
          enum: ["all", "opportunity", "answer", "profile"],
          description: "Scope filter (defaults to 'all')",
        },
      },
      required: ["query"],
    },
  },
];
