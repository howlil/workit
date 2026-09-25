import { describe, it, expect, vi, beforeEach } from "vitest";
import { createWorkitMcpServer } from "../server.js";
import { WORKIT_MCP_TOOLS } from "../tools.js";
import type { McpServices } from "../types.js";
import type {
  FullCareerProfile,
  SaveOpportunityResponse,
  JobMatchAnalysis,
  SearchResultItem,
} from "@workit/contracts";
import type { AnswerMemoryItem } from "@workit/domain";
import type { OpportunityDetail } from "../types.js";

describe("S13 — Model Context Protocol (MCP) Server", () => {
  let mockServices: McpServices;

  const sampleProfile: FullCareerProfile = {
    profile: {
      id: "prof_1",
      userId: "usr_test",
      fullName: "Alex Rivera",
      email: "alex@workit.dev",
      phone: "+1 555-0100",
      location: "San Francisco, CA",
      createdAt: "2026-09-25T00:00:00Z",
      updatedAt: "2026-09-25T00:00:00Z",
    },
    experiences: [
      {
        id: "exp_1",
        profileId: "prof_1",
        company: "Stripe",
        title: "Staff Software Engineer",
        isCurrent: true,
        startDate: "2022-01",
        facts: [
          {
            id: "fact_1",
            experienceId: "exp_1",
            factText: "Architected distributed ledger processing $50B annually",
          },
        ],
      },
    ],
    education: [],
    skills: [
      {
        id: "skill_1",
        profileId: "prof_1",
        name: "Go",
      },
      {
        id: "skill_2",
        profileId: "prof_1",
        name: "Distributed Systems",
      },
    ],
  };

  const sampleOppDetail: OpportunityDetail = {
    opportunity: {
      id: "opp_123",
      userId: "usr_test",
      canonicalUrl: "https://boards.greenhouse.io/acme/jobs/123",
      company: "Acme Corp",
      title: "Distributed Systems Architect",
      location: "Remote",
      workArrangement: "remote",
      employmentType: "Full-time",
      state: "saved",
      currentSnapshotId: "snap_123",
      createdAt: "2026-09-25T00:00:00Z",
      updatedAt: "2026-09-25T00:00:00Z",
    },
    currentSnapshot: {
      id: "snap_123",
      opportunityId: "opp_123",
      company: "Acme Corp",
      title: "Distributed Systems Architect",
      location: "Remote",
      employmentType: "Full-time",
      workArrangement: "remote",
      descriptionText: "We need an engineer experienced with Go and distributed systems.",
      sourceUrl: "https://boards.greenhouse.io/acme/jobs/123",
      capturedAt: "2026-09-25T00:00:00Z",
      contentHash: "hash_123",
    },
  };

  const sampleAnswer: AnswerMemoryItem = {
    id: "ans_1",
    userId: "usr_test",
    questionKey: "why work here",
    questionText: "Why do you want to join our engineering team?",
    answerText: "I am passionate about large-scale distributed systems and developer infrastructure.",
    category: "motivation",
    usageCount: 2,
    lastUsedAt: "2026-09-25T00:00:00Z",
    createdAt: "2026-09-25T00:00:00Z",
    updatedAt: "2026-09-25T00:00:00Z",
  };

  beforeEach(() => {
    mockServices = {
      searchOpportunities: vi.fn().mockResolvedValue([sampleOppDetail.opportunity]),
      getOpportunity: vi.fn().mockResolvedValue(sampleOppDetail),
      saveOpportunity: vi.fn().mockResolvedValue({
        opportunityId: "opp_new_1",
        state: "saved",
        snapshotId: "snap_new_1",
        isDuplicate: false,
      } as SaveOpportunityResponse),
      getCareerProfile: vi.fn().mockResolvedValue(sampleProfile),
      findAnswerMatch: vi.fn().mockResolvedValue(sampleAnswer),
      saveAnswer: vi.fn().mockResolvedValue(sampleAnswer),
      matchJobEvidence: vi.fn().mockResolvedValue({
        overallScore: 92,
        matchedCount: 2,
        partialCount: 0,
        missingCount: 0,
        totalRequirements: 2,
        matches: [
          {
            requirement: "Proficiency in Go",
            status: "matched",
            score: 1,
            evidenceFactIds: ["skill_1"],
            evidenceSummary: "Matched profile skill: Go",
          },
        ],
      } as JobMatchAnalysis),
      searchGlobal: vi.fn().mockResolvedValue([
        {
          id: "opp_123",
          type: "opportunity",
          title: "Distributed Systems Architect",
          subtitle: "Acme Corp (saved)",
        } as SearchResultItem,
      ]),
      startApplication: vi.fn().mockResolvedValue({
        application: { id: "app_1", state: "applying" },
        event: { id: "evt_1", action: "START_APPLICATION" },
      }),
      confirmSubmission: vi.fn().mockResolvedValue({
        application: { id: "app_1", state: "applied" },
        event: { id: "evt_2", action: "CONFIRM_SUBMISSION" },
        answers: [],
      }),
    };
  });

  it("handles 'initialize' protocol handshake conforming to MCP 2024-11-05", async () => {
    const server = createWorkitMcpServer({
      services: mockServices,
      userId: "usr_test",
    });

    const response = await server.handleMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "claude-desktop", version: "1.0.0" },
      },
    });

    expect(response).not.toBeNull();
    expect(response?.jsonrpc).toBe("2.0");
    expect(response?.id).toBe(1);
    expect(response?.result.protocolVersion).toBe("2024-11-05");
    expect(response?.result.serverInfo.name).toBe("workit-mcp");
    expect(response?.result.capabilities.tools).toBeDefined();
  });

  it("handles 'ping'", async () => {
    const server = createWorkitMcpServer({ services: mockServices });
    const response = await server.handleMessage({
      jsonrpc: "2.0",
      id: 2,
      method: "ping",
    });

    expect(response?.result).toEqual({});
  });

  it("lists all Workit MCP tools via 'tools/list'", async () => {
    const server = createWorkitMcpServer({ services: mockServices });
    const response = await server.handleMessage({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/list",
    });

    expect(response?.result?.tools).toBeDefined();
    expect(response?.result?.tools.length).toBe(WORKIT_MCP_TOOLS.length);

    const toolNames = response?.result?.tools.map((t: any) => t.name);
    expect(toolNames).toContain("search_opportunities");
    expect(toolNames).toContain("get_opportunity");
    expect(toolNames).toContain("save_opportunity");
    expect(toolNames).toContain("get_career_profile");
    expect(toolNames).toContain("search_answers");
    expect(toolNames).toContain("save_answer");
    expect(toolNames).toContain("match_job_evidence");
    expect(toolNames).toContain("search_global");
    expect(toolNames).toContain("start_application");
    expect(toolNames).toContain("confirm_submission");
  });

  describe("tools/call executions", () => {
    it("calls 'search_opportunities' with query and filters", async () => {
      const server = createWorkitMcpServer({ services: mockServices, userId: "usr_test" });

      const response = await server.handleMessage({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "search_opportunities",
          arguments: { query: "Architect", state: "saved" },
        },
      });

      expect(mockServices.searchOpportunities).toHaveBeenCalledWith("usr_test", {
        query: "Architect",
        state: "saved",
        limit: 20,
      });

      expect(response?.result.isError).toBeFalsy();
      const content = JSON.parse(response?.result.content[0].text);
      expect(content.count).toBe(1);
      expect(content.opportunities[0].title).toBe("Distributed Systems Architect");
    });

    it("calls 'get_opportunity' and returns details + snapshot", async () => {
      const server = createWorkitMcpServer({ services: mockServices, userId: "usr_test" });

      const response = await server.handleMessage({
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
          name: "get_opportunity",
          arguments: { id: "opp_123" },
        },
      });

      expect(mockServices.getOpportunity).toHaveBeenCalledWith("usr_test", "opp_123");
      const content = JSON.parse(response?.result.content[0].text);
      expect(content.opportunity.company).toBe("Acme Corp");
      expect(content.currentSnapshot.descriptionText).toContain("experienced with Go");
    });

    it("returns error on 'get_opportunity' if not found", async () => {
      vi.mocked(mockServices.getOpportunity).mockResolvedValueOnce(null);
      const server = createWorkitMcpServer({ services: mockServices, userId: "usr_test" });

      const response = await server.handleMessage({
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: {
          name: "get_opportunity",
          arguments: { id: "opp_nonexistent" },
        },
      });

      expect(response?.result.isError).toBe(true);
      expect(response?.result.content[0].text).toContain("not found");
    });

    it("calls 'save_opportunity' with candidate data", async () => {
      const server = createWorkitMcpServer({ services: mockServices, userId: "usr_test" });

      const response = await server.handleMessage({
        jsonrpc: "2.0",
        id: 7,
        method: "tools/call",
        params: {
          name: "save_opportunity",
          arguments: {
            url: "https://boards.greenhouse.io/acme/jobs/456",
            title: "Staff SRE",
            company: "Acme",
            descriptionText: "Looking for SRE with Kubernetes experience.",
            workArrangement: "remote",
          },
        },
      });

      expect(mockServices.saveOpportunity).toHaveBeenCalledWith(
        "usr_test",
        expect.objectContaining({
          title: "Staff SRE",
          company: "Acme",
          descriptionText: "Looking for SRE with Kubernetes experience.",
        })
      );

      const content = JSON.parse(response?.result.content[0].text);
      expect(content.opportunityId).toBe("opp_new_1");
      expect(content.isDuplicate).toBe(false);
    });

    it("calls 'get_career_profile' and supports section extraction", async () => {
      const server = createWorkitMcpServer({ services: mockServices, userId: "usr_test" });

      // Test full profile
      const fullResp = await server.handleMessage({
        jsonrpc: "2.0",
        id: 8,
        method: "tools/call",
        params: {
          name: "get_career_profile",
          arguments: { section: "all" },
        },
      });

      const fullContent = JSON.parse(fullResp?.result.content[0].text);
      expect(fullContent.profile.fullName).toBe("Alex Rivera");
      expect(fullContent.skills.length).toBe(2);

      // Test skills section
      const skillsResp = await server.handleMessage({
        jsonrpc: "2.0",
        id: 9,
        method: "tools/call",
        params: {
          name: "get_career_profile",
          arguments: { section: "skills" },
        },
      });

      const skillsContent = JSON.parse(skillsResp?.result.content[0].text);
      expect(skillsContent[0].name).toBe("Go");
    });

    it("calls 'search_answers' to find best match for question", async () => {
      const server = createWorkitMcpServer({ services: mockServices, userId: "usr_test" });

      const response = await server.handleMessage({
        jsonrpc: "2.0",
        id: 10,
        method: "tools/call",
        params: {
          name: "search_answers",
          arguments: { question: "Why do you want to join?" },
        },
      });

      expect(mockServices.findAnswerMatch).toHaveBeenCalledWith("usr_test", "Why do you want to join?");
      const content = JSON.parse(response?.result.content[0].text);
      expect(content.hasMatch).toBe(true);
      expect(content.bestMatch.category).toBe("motivation");
    });

    it("calls 'save_answer' to persist reusable answer", async () => {
      const server = createWorkitMcpServer({ services: mockServices, userId: "usr_test" });

      const response = await server.handleMessage({
        jsonrpc: "2.0",
        id: 11,
        method: "tools/call",
        params: {
          name: "save_answer",
          arguments: {
            questionText: "Tell us about a technical challenge you overcame.",
            answerText: "I debugged a distributed race condition in a multi-region Raft cluster.",
            category: "technical",
          },
        },
      });

      expect(mockServices.saveAnswer).toHaveBeenCalledWith("usr_test", {
        questionText: "Tell us about a technical challenge you overcame.",
        answerText: "I debugged a distributed race condition in a multi-region Raft cluster.",
        category: "technical",
      });

      expect(response?.result.isError).toBeFalsy();
    });

    it("calls 'match_job_evidence' preserving canonical evidence invariant", async () => {
      const server = createWorkitMcpServer({ services: mockServices, userId: "usr_test" });

      const response = await server.handleMessage({
        jsonrpc: "2.0",
        id: 12,
        method: "tools/call",
        params: {
          name: "match_job_evidence",
          arguments: {
            jobDescription: "We require proficiency in Go and experience scaling distributed systems.",
          },
        },
      });

      expect(mockServices.matchJobEvidence).toHaveBeenCalledWith(
        "usr_test",
        "We require proficiency in Go and experience scaling distributed systems."
      );

      const content = JSON.parse(response?.result.content[0].text);
      expect(content.overallScore).toBe(92);
      expect(content.matches[0].evidenceFactIds).toContain("skill_1");
    });

    it("calls 'search_global' with scope", async () => {
      const server = createWorkitMcpServer({ services: mockServices, userId: "usr_test" });

      const response = await server.handleMessage({
        jsonrpc: "2.0",
        id: 13,
        method: "tools/call",
        params: {
          name: "search_global",
          arguments: {
            query: "Architect",
            scope: "opportunity",
          },
        },
      });

      expect(mockServices.searchGlobal).toHaveBeenCalledWith("usr_test", "Architect", "opportunity");
      const content = JSON.parse(response?.result.content[0].text);
      expect(content.count).toBe(1);
    });

    it("calls 'start_application' with opportunityId", async () => {
      const server = createWorkitMcpServer({ services: mockServices, userId: "usr_test" });

      const response = await server.handleMessage({
        jsonrpc: "2.0",
        id: 14,
        method: "tools/call",
        params: {
          name: "start_application",
          arguments: {
            opportunityId: "opp_123",
          },
        },
      });

      expect(mockServices.startApplication).toHaveBeenCalledWith("usr_test", "opp_123");
      const content = JSON.parse(response?.result.content[0].text);
      expect(content.message).toContain("started successfully");
      expect(content.application.state).toBe("applying");
    });

    it("calls 'confirm_submission' with snapshotId and answers", async () => {
      const server = createWorkitMcpServer({ services: mockServices, userId: "usr_test" });

      const response = await server.handleMessage({
        jsonrpc: "2.0",
        id: 15,
        method: "tools/call",
        params: {
          name: "confirm_submission",
          arguments: {
            applicationId: "app_1",
            snapshotId: "snap_123",
            answers: [{ questionKey: "q1", questionText: "Question?", answerText: "Answer!" }],
          },
        },
      });

      expect(mockServices.confirmSubmission).toHaveBeenCalledWith("usr_test", "app_1", {
        snapshotId: "snap_123",
        resumeArtifactId: undefined,
        answers: [{ questionKey: "q1", questionText: "Question?", answerText: "Answer!" }],
      });
      const content = JSON.parse(response?.result.content[0].text);
      expect(content.message).toContain("confirmed and frozen");
      expect(content.application.state).toBe("applied");
    });

    it("returns -32601 on unknown tool call", async () => {
      const server = createWorkitMcpServer({ services: mockServices });

      const response = await server.handleMessage({
        jsonrpc: "2.0",
        id: 99,
        method: "tools/call",
        params: {
          name: "nonexistent_tool",
          arguments: {},
        },
      });

      expect(response?.result.isError).toBe(true);
      expect(response?.result.content[0].text).toContain("Unknown tool");
    });
  });
});
