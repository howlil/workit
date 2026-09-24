import { Hono } from "hono";
import type { AnswerService } from "../services/answers";
import type {
  SaveAnswerMemoryRequest,
  FindAnswerMatchRequest,
} from "@workit/contracts";

export function createAnswerRouter(getService: (c: any) => AnswerService) {
  const router = new Hono<{ Variables: { userId: string } }>();

  // GET /api/answers — List all answers for the authenticated user
  router.get("/", async (c) => {
    const userId = c.get("userId");
    const service = getService(c);
    const result = await service.list(userId);
    return c.json(result, 200);
  });

  // POST /api/answers — Save or update an answer memory item
  router.post("/", async (c) => {
    const userId = c.get("userId");
    const body = (await c.req.json()) as SaveAnswerMemoryRequest;

    if (!body.questionText || !body.answerText) {
      return c.json({ error: "questionText and answerText are required" }, 400);
    }

    const service = getService(c);
    const result = await service.save(userId, body);
    return c.json(result, 201);
  });

  // POST /api/answers/match — Find best matching answer for a given question
  router.post("/match", async (c) => {
    const userId = c.get("userId");
    const body = (await c.req.json()) as FindAnswerMatchRequest;

    if (!body.questionText) {
      return c.json({ error: "questionText is required" }, 400);
    }

    const service = getService(c);
    const result = await service.findMatch(userId, body.questionText, body.threshold);
    return c.json(result, 200);
  });

  // DELETE /api/answers/:id — Delete an answer memory
  router.delete("/:id", async (c) => {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const service = getService(c);
    await service.delete(userId, id);
    return c.json({ success: true }, 200);
  });

  return router;
}
