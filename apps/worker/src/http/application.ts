import { Hono } from "hono";
import type { ApplicationService } from "../services/application";
import type {
  StartApplicationRequest,
  ConfirmSubmissionRequest,
} from "@workit/contracts";

export function createApplicationRouter(getService: (c: any) => ApplicationService) {
  const router = new Hono<{ Variables: { userId: string } }>();

  // POST /api/applications/start — Start applying to an opportunity
  router.post("/start", async (c) => {
    const userId = c.get("userId");
    const body = (await c.req.json()) as StartApplicationRequest;

    if (!body.opportunityId) {
      return c.json({ error: "opportunityId is required" }, 400);
    }

    const service = getService(c);
    const result = await service.start(userId, body.opportunityId);
    return c.json(result, 201);
  });

  // POST /api/applications/:id/submit — Atomically confirm submission and freeze snapshot
  router.post("/:id/submit", async (c) => {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const body = (await c.req.json()) as ConfirmSubmissionRequest;

    if (!body.snapshotId) {
      return c.json({ error: "snapshotId is required to freeze historical content" }, 400);
    }

    const service = getService(c);
    try {
      const result = await service.confirmSubmission(userId, id, body);
      return c.json(result, 200);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  // GET /api/applications/by-opportunity/:opportunityId
  router.get("/by-opportunity/:opportunityId", async (c) => {
    const userId = c.get("userId");
    const oppId = c.req.param("opportunityId");
    const service = getService(c);
    const detail = await service.getByOpportunity(userId, oppId);

    if (!detail) {
      return c.json({ error: "Application not found" }, 404);
    }

    return c.json(detail);
  });

  return router;
}
