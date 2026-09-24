import { Hono } from "hono";
import type { ProfileService } from "../services/profile";
import type {
  UpdateProfileIdentityRequest,
  CreateExperienceRequest,
  CreateEducationRequest,
  UpdateSkillsRequest,
} from "@workit/contracts";

export function createProfileRouter(getService: (c: any) => ProfileService) {
  const router = new Hono<{ Variables: { userId: string } }>();

  // GET /api/profile — Get full career profile
  router.get("/", async (c) => {
    const userId = c.get("userId");
    const service = getService(c);
    const profile = await service.getProfile(userId);
    return c.json(profile);
  });

  // PATCH /api/profile — Update personal identity fields
  router.patch("/", async (c) => {
    const userId = c.get("userId");
    const body = (await c.req.json()) as UpdateProfileIdentityRequest;
    const service = getService(c);
    const updated = await service.updateIdentity(userId, body);
    return c.json(updated);
  });

  // POST /api/profile/experiences — Add work experience
  router.post("/experiences", async (c) => {
    const userId = c.get("userId");
    const body = (await c.req.json()) as CreateExperienceRequest;

    if (!body.company || !body.title || !body.startDate) {
      return c.json({ error: "company, title, and startDate are required" }, 400);
    }

    const service = getService(c);
    const exp = await service.addExperience(userId, body);
    return c.json(exp, 201);
  });

  // DELETE /api/profile/experiences/:id — Delete work experience
  router.delete("/experiences/:id", async (c) => {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const service = getService(c);
    await service.deleteExperience(userId, id);
    return c.json({ success: true });
  });

  // POST /api/profile/education — Add education
  router.post("/education", async (c) => {
    const userId = c.get("userId");
    const body = (await c.req.json()) as CreateEducationRequest;

    if (!body.institution) {
      return c.json({ error: "institution is required" }, 400);
    }

    const service = getService(c);
    const edu = await service.addEducation(userId, body);
    return c.json(edu, 201);
  });

  // DELETE /api/profile/education/:id — Delete education
  router.delete("/education/:id", async (c) => {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const service = getService(c);
    await service.deleteEducation(userId, id);
    return c.json({ success: true });
  });

  // PUT /api/profile/skills — Replace skills list
  router.put("/skills", async (c) => {
    const userId = c.get("userId");
    const body = (await c.req.json()) as UpdateSkillsRequest;
    const service = getService(c);
    const skills = await service.setSkills(userId, body.skills || []);
    return c.json({ skills });
  });

  return router;
}
