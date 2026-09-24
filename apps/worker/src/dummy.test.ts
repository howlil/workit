import { describe, it, expect } from "vitest";

describe("worker", () => {
  it("should pass a dummy test", () => {
    expect("workit-api").toContain("workit");
  });
});
