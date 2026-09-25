import { describe, it, expect } from "vitest";
import app from "../index.js";

describe("Worker MCP HTTP Adapter", () => {
  it("GET /api/mcp/tools returns registered MCP tools list", async () => {
    const res = await app.request("http://localhost/api/mcp/tools");
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.tools).toBeDefined();
    expect(Array.isArray(body.tools)).toBe(true);
    expect(body.tools.length).toBeGreaterThanOrEqual(7);

    const toolNames = body.tools.map((t: any) => t.name);
    expect(toolNames).toContain("search_opportunities");
    expect(toolNames).toContain("save_opportunity");
    expect(toolNames).toContain("get_career_profile");
    expect(toolNames).toContain("match_job_evidence");
  });

  it("POST /mcp handles JSON-RPC initialize handshake", async () => {
    const res = await app.request("http://localhost/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test-agent", version: "1.0.0" },
        },
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.jsonrpc).toBe("2.0");
    expect(body.id).toBe(1);
    expect(body.result.protocolVersion).toBe("2024-11-05");
    expect(body.result.capabilities.tools).toBeDefined();
  });

  it("POST /mcp executes tools/call to get_career_profile", async () => {
    const res = await app.request("http://localhost/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr_mcp_test",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "get_career_profile",
          arguments: { section: "all" },
        },
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.result.isError).toBeFalsy();
    const content = JSON.parse(body.result.content[0].text);
    expect(content.profile).toBeDefined();
    expect(content.skills).toBeDefined();
  });

  it("POST /mcp executes tools/call to match_job_evidence", async () => {
    const res = await app.request("http://localhost/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr_mcp_test",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "match_job_evidence",
          arguments: {
            jobDescription: "Requires 5+ years of experience with TypeScript and React.",
          },
        },
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.result.isError).toBeFalsy();
    const content = JSON.parse(body.result.content[0].text);
    expect(content.totalRequirements).toBeGreaterThan(0);
    expect(Array.isArray(content.matches)).toBe(true);
  });
});
