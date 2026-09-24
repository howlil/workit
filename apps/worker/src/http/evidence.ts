import { Hono } from "hono";
import type { EvidenceService } from "../services/evidence";
import type { JobMatchRequest, JobMatchResponse } from "@workit/contracts";

export function createEvidenceRouter(getService: (c: any) => EvidenceService) {
  const router = new Hono<{ Variables: { userId: string } }>();

  // POST /api/evidence/match — Match a job description against user's career profile
  router.post("/match", async (c) => {
    const userId = c.get("userId");
    const body = (await c.req.json()) as JobMatchRequest;

    if (!body.jobDescription) {
      return c.json({ error: "jobDescription is required" }, 400);
    }

    const service = getService(c);
    const analysis = await service.matchJob(userId, body.jobDescription);
    const response: JobMatchResponse = { analysis };
    return c.json(response, 200);
  });

  return router;
}
