import { describe, it, expect } from "vitest";
import app from "../index";

describe("Worker Auth Guard Middleware", () => {
  it("allows public access to /api/health without credentials", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe("ok");
  });

  it("in development/test environment, falls back to x-user-id header or default", async () => {
    const res = await app.request("/api/opportunities", {
      headers: { "x-user-id": "usr_dev_123" },
    });
    // Should pass auth check (200 with empty items list or similar)
    expect(res.status).toBe(200);
  });

  it("in production environment, rejects requests missing authentication with 401", async () => {
    const res = await app.request(
      "/api/opportunities",
      {
        headers: { "x-user-id": "usr_spoofed" },
      },
      {
        ENVIRONMENT: "production",
      }
    );

    expect(res.status).toBe(401);
    const data = (await res.json()) as any;
    expect(data.error).toContain("Unauthorized");
  });

  it("in production environment, accepts valid Bearer token", async () => {
    const res = await app.request(
      "/api/opportunities",
      {
        headers: { Authorization: "Bearer usr_prod_verified" },
      },
      {
        ENVIRONMENT: "production",
      }
    );

    expect(res.status).toBe(200);
  });

  it("in production environment, accepts Cloudflare Access authenticated header", async () => {
    const res = await app.request(
      "/api/opportunities",
      {
        headers: { "cf-access-authenticated-user-email": "dev@workit.app" },
      },
      {
        ENVIRONMENT: "production",
      }
    );

    expect(res.status).toBe(200);
  });
});
