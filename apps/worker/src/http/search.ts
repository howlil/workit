import { Hono } from "hono";
import type { SearchService } from "../services/search.js";

export function createSearchRouter(getService: (c: any) => SearchService) {
  const router = new Hono<{ Variables: { userId: string } }>();

  router.get("/", async (c) => {
    const userId = c.get("userId");
    const query = c.req.query("q") || "";
    const service = getService(c);
    const result = await service.search(userId, query);
    return c.json(result, 200);
  });

  return router;
}
