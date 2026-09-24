import { Hono } from "hono";
import type { OpportunityService } from "../services/opportunity";
import type { SaveOpportunityRequest, OpportunityState } from "@workit/contracts";

export function createOpportunityRouter(getService: (c: any) => OpportunityService) {
  const router = new Hono<{ Variables: { userId: string } }>();

  // POST /api/opportunities — Save a job candidate
  router.post("/", async (c) => {
    const userId = c.get("userId");
    const body = (await c.req.json()) as SaveOpportunityRequest;

    if (!body || !body.candidate || !body.candidate.source?.canonicalUrl) {
      return c.json(
        { error: "Invalid request: candidate with canonicalUrl is required" },
        400
      );
    }

    const service = getService(c);
    const result = await service.save(userId, body.candidate);

    return c.json(result, result.isDuplicate ? 200 : 201);
  });

  // GET /api/opportunities/check — Check if a URL or provider+sourceJobId is already saved
  router.get("/check", async (c) => {
    const userId = c.get("userId");
    const url = c.req.query("url");
    const provider = c.req.query("provider");
    const sourceJobId = c.req.query("sourceJobId");

    const service = getService(c);
    const result = await service.checkExistence(userId, { url, provider, sourceJobId });

    return c.json(result);
  });

  // GET /api/opportunities/:id — Get opportunity detail with current snapshot
  router.get("/:id", async (c) => {
    const userId = c.get("userId");
    const id = c.req.param("id");

    const service = getService(c);
    const detail = await service.getDetail(userId, id);

    if (!detail) {
      return c.json({ error: "Opportunity not found" }, 404);
    }

    return c.json(detail);
  });

  // GET /api/opportunities — List opportunities
  router.get("/", async (c) => {
    const userId = c.get("userId");
    const state = c.req.query("state") as OpportunityState | undefined;
    const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;

    const service = getService(c);
    const list = await service.list(userId, { state, limit });

    return c.json({ items: list });
  });

  return router;
}
