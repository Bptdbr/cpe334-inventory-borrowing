import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";
import os from "os";

// We create a temporary static dist fixture
const tmpDistDir = path.join(os.tmpdir(), `cpe334-test-dist-${Date.now()}`);

beforeAll(() => {
  fs.mkdirSync(tmpDistDir, { recursive: true });
  fs.writeFileSync(path.join(tmpDistDir, "index.html"), "<html><body>SPA Root</body></html>");
  fs.writeFileSync(path.join(tmpDistDir, "app.js"), "console.log('test-bundle');");
  process.env.CLIENT_DIST_PATH = tmpDistDir;
  process.env.NODE_ENV = "production";
});

afterAll(() => {
  try {
    fs.rmSync(tmpDistDir, { recursive: true, force: true });
  } catch {}
});

describe("Static frontend serving and SPA fallback in production (L5-2, AC-L5-03, AC-L5-04, AC-L5-05)", () => {
  it("TEST-L5-03: GET / serves index.html in production", async () => {
    const { app } = await import("../../src/app.js");
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.text).toContain("SPA Root");
  });

  it("TEST-L5-04: GET /items (client SPA route) falls back to index.html in production", async () => {
    const { app } = await import("../../src/app.js");
    const res = await request(app).get("/items");

    expect(res.status).toBe(200);
    expect(res.text).toContain("SPA Root");
  });

  it("TEST-L5-05: GET /api/unmatched-route is not intercepted by SPA and returns 404 JSON", async () => {
    const { app } = await import("../../src/app.js");
    const res = await request(app).get("/api/unmatched-route");

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toMatchObject({
      error: {
        code: "NOT_FOUND",
      },
    });
  });
});
