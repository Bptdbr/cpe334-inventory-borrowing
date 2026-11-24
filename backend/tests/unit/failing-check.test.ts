import { describe, it, expect } from "vitest";

describe("Demonstration of C-02 merge lock check (L5-6, R-06)", () => {
  it("deliberately fails to prove that failing required check blocks merge into lab5-staging", () => {
    // This test is temporary and intentional on branch test/lab5-failing-check
    expect(true).toBe(false);
  });
});
