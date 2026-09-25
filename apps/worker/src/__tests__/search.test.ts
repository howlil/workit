import { describe, it, expect } from "vitest";
import app from "../index.js";

describe("Worker Global Search API", () => {
  const userId = "usr_search_test";

  it("searches across opportunities, answers, and profile facts", async () => {
    // 1. Seed an opportunity
    await app.request("/api/opportunities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        candidate: {
          source: { canonicalUrl: "https://example.com/job/distributed-systems" },
          company: "Databricks",
          title: "Senior Distributed Systems Engineer",
          location: "San Francisco, CA",
          descriptionText: "We need distributed systems experts in Kafka and Raft.",
          extraction: { strategy: "generic", confidence: 0.9 },
        },
      }),
    });

    // 2. Seed an answer memory
    await app.request("/api/answers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        questionText: "What distributed consensus algorithms have you implemented?",
        answerText: "I implemented a Raft consensus cluster in Go with log replication and leader election.",
        category: "technical",
      }),
    });

    // 3. Search query "Distributed" -> should match opportunity
    const res1 = await app.request("/api/search?q=Distributed", {
      headers: { "x-user-id": userId },
    });
    expect(res1.status).toBe(200);
    const data1 = (await res1.json()) as any;
    expect(data1.results.length).toBeGreaterThanOrEqual(1);
    expect(data1.results.some((r: any) => r.type === "opportunity" && r.title.includes("Distributed"))).toBe(true);

    // 4. Search query "Raft" -> should match both answer and opportunity
    const res2 = await app.request("/api/search?q=Raft", {
      headers: { "x-user-id": userId },
    });
    expect(res2.status).toBe(200);
    const data2 = (await res2.json()) as any;
    expect(data2.results.length).toBeGreaterThanOrEqual(1);
    expect(data2.results.some((r: any) => r.type === "answer")).toBe(true);

    // 5. Search non-matching query -> empty results
    const res3 = await app.request("/api/search?q=nonexistentqueryxyz", {
      headers: { "x-user-id": userId },
    });
    expect(res3.status).toBe(200);
    const data3 = (await res3.json()) as any;
    expect(data3.results).toHaveLength(0);
  });
});
