import { Hono } from "hono";
import {
  createWorkitMcpServer,
  WORKIT_MCP_TOOLS,
  type McpServices,
  type JsonRpcRequest,
} from "@workit/mcp";
import type { D1DatabaseLike } from "@workit/db";
import {
  getOpportunityService,
  getProfileService,
  getApplicationService,
  getAnswerService,
  getEvidenceService,
  getSearchService,
} from "../index.js";

export function createWorkerMcpServices(db: D1DatabaseLike): McpServices {
  const oppService = getOpportunityService(db);
  const profileService = getProfileService(db);
  const appService = getApplicationService(db);
  const ansService = getAnswerService(db);
  const evidenceService = getEvidenceService(db);
  const searchService = getSearchService(db);

  return {
    async searchOpportunities(userId, options) {
      if (options.query) {
        const found = await searchService.search(userId, options.query);
        return found.results.filter((r) => r.type === "opportunity");
      }
      return oppService.list(userId, options);
    },
    async getOpportunity(userId, id) {
      return oppService.getDetail(userId, id);
    },
    async saveOpportunity(userId, candidate) {
      return oppService.save(userId, candidate);
    },
    async getCareerProfile(userId) {
      return profileService.getProfile(userId);
    },
    async findAnswerMatch(userId, question) {
      const res = await ansService.findMatch(userId, question);
      return res.match ? res.match.item : null;
    },
    async saveAnswer(userId, input) {
      return ansService.save(userId, input);
    },
    async matchJobEvidence(userId, jobDescription) {
      return evidenceService.matchJob(userId, jobDescription);
    },
    async searchGlobal(userId, query, scope) {
      const res = await searchService.search(userId, query);
      if (scope && scope !== "all") {
        return res.results.filter((r) => r.type === scope);
      }
      return res.results;
    },
    async startApplication(userId, opportunityId) {
      return appService.start(userId, opportunityId);
    },
    async confirmSubmission(userId, applicationId, data) {
      return appService.confirmSubmission(userId, applicationId, data);
    },
  };
}

export function createMcpRouter(getDb: (c: any) => D1DatabaseLike) {
  const router = new Hono<{ Variables: { userId: string } }>();

  // GET /api/mcp/tools — Quick HTTP tool discovery endpoint
  router.get("/tools", (c) => {
    return c.json({
      tools: WORKIT_MCP_TOOLS,
    });
  });

  // POST /api/mcp — JSON-RPC 2.0 endpoint for MCP protocol
  router.post("/", async (c) => {
    const userId = c.get("userId") || "usr_default";
    const db = getDb(c);
    const services = createWorkerMcpServices(db);
    const mcpServer = createWorkitMcpServer({
      services,
      userId,
      serverName: "workit-worker-mcp",
      serverVersion: "0.0.1",
    });

    const body = (await c.req.json()) as JsonRpcRequest;
    const response = await mcpServer.handleMessage(body, { userId });

    if (response === null) {
      return c.body(null, 204);
    }

    return c.json(response);
  });

  return router;
}
