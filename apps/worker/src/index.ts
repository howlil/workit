import { Hono } from "hono";

type Bindings = {
  // DB: D1Database — uncomment when D1 is provisioned
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/health", (c) => {
  return c.json({ status: "ok", service: "workit-api" });
});

// Opportunity routes will be added in S3
// app.route("/api/opportunities", opportunityRoutes);

export default app;
