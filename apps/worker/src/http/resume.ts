import { Hono } from "hono";
import type { ResumeService } from "../services/resume.js";
import type {
  ParseResumeRequest,
  ConfirmResumeDraftRequest,
} from "@workit/contracts";

export function createResumeRouter(getService: (c: any) => ResumeService) {
  const router = new Hono<{ Variables: { userId: string } }>();

  // GET /api/resume — List all saved resume artifacts
  router.get("/", async (c) => {
    const userId = c.get("userId");
    const service = getService(c);
    const resumes = await service.list(userId);
    return c.json({ resumes }, 200);
  });

  // GET /api/resume/:id — Get a single resume artifact
  router.get("/:id", async (c) => {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const service = getService(c);
    const resume = await service.getById(userId, id);
    if (!resume) {
      return c.json({ error: "Resume not found" }, 404);
    }
    return c.json(resume, 200);
  });

  // POST /api/resume/parse — Parse raw resume text and save artifact
  router.post("/parse", async (c) => {
    const userId = c.get("userId");
    const body = (await c.req.json()) as ParseResumeRequest;

    if (!body.rawText || !body.fileName) {
      return c.json({ error: "fileName and rawText are required" }, 400);
    }

    const service = getService(c);
    const result = await service.parseAndSave(userId, body);
    return c.json(result, 201);
  });

  // POST /api/resume/confirm — Confirm draft and populate career profile
  router.post("/confirm", async (c) => {
    const userId = c.get("userId");
    const body = (await c.req.json()) as ConfirmResumeDraftRequest;

    if (!body.draft) {
      return c.json({ error: "draft is required" }, 400);
    }

    const service = getService(c);
    const result = await service.confirmDraft(userId, body);
    return c.json(result, 200);
  });

  return router;
}
