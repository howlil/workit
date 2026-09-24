import { describe, it, expect } from "vitest";
import app from "../index";

describe("Worker Answers API", () => {
  const userId = "usr_answer_test";

  it("saves, lists, matches, updates, and deletes answer memories", async () => {
    // 1. Save an answer memory
    const saveRes = await app.request("/api/answers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        questionText: "Why do you want to work at our company?",
        answerText: "I am passionate about building resilient distributed systems and admire your open source culture.",
        category: "motivation",
      }),
    });

    expect(saveRes.status).toBe(201);
    const saved = (await saveRes.json()) as any;
    expect(saved.id).toBeDefined();
    expect(saved.questionKey).toBe("why do you want to work at our company");
    expect(saved.usageCount).toBe(1);

    // 2. List answer memories
    const listRes = await app.request("/api/answers", {
      headers: { "x-user-id": userId },
    });
    expect(listRes.status).toBe(200);
    const listData = (await listRes.json()) as any;
    expect(listData.answers.length).toBeGreaterThanOrEqual(1);
    const found = listData.answers.find((a: any) => a.id === saved.id);
    expect(found).toBeDefined();

    // 3. Match answer memory
    const matchRes = await app.request("/api/answers/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        questionText: "Why do you want to work for our company?",
      }),
    });
    expect(matchRes.status).toBe(200);
    const matchData = (await matchRes.json()) as any;
    expect(matchData.match).not.toBeNull();
    expect(matchData.match.similarityScore).toBeGreaterThanOrEqual(0.7);
    expect(matchData.match.item.answerText).toContain("passionate about building");

    // 4. Upsert (increment usage and update answer text)
    const updateRes = await app.request("/api/answers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        questionText: "Why do you want to work at our company?",
        answerText: "Updated: I am passionate about developer tooling.",
      }),
    });
    expect(updateRes.status).toBe(201);
    const updated = (await updateRes.json()) as any;
    expect(updated.id).toBe(saved.id);
    expect(updated.usageCount).toBe(2);
    expect(updated.answerText).toContain("Updated:");

    // 5. Delete answer memory
    const deleteRes = await app.request(`/api/answers/${saved.id}`, {
      method: "DELETE",
      headers: { "x-user-id": userId },
    });
    expect(deleteRes.status).toBe(200);

    // 6. Verify deleted
    const listAfterRes = await app.request("/api/answers", {
      headers: { "x-user-id": userId },
    });
    const listAfterData = (await listAfterRes.json()) as any;
    expect(listAfterData.answers.some((a: any) => a.id === saved.id)).toBe(false);
  });
});
