import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "../../src/lib/prisma.js";
import { app } from "../../src/app.js";

describe("Readiness probe GET /api/ready (L5-2, AC-L5-01, AC-L5-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TEST-L5-01: returns 200 OK with status 'ready' when database check succeeds", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ "?column?": 1 }]);

    const res = await request(app).get("/api/ready");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready" });
    expect(res.body).not.toHaveProperty("stack");
    expect(res.body).not.toHaveProperty("database");
  });

  it("TEST-L5-02: returns 503 Service Unavailable with status 'unready' when database fails, leaking no details", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("Connection refused at 5432"));

    const res = await request(app).get("/api/ready");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "unready" });
    expect(res.body).not.toHaveProperty("stack");
    expect(res.text).not.toContain("Connection refused");
  });
});
