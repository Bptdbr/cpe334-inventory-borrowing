import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /health", () => {
  it("returns 200 OK with status 'ok' and timestamp", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "ok");
    expect(response.body).toHaveProperty("timestamp");
    expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    // Ensure no private or internal details are exposed
    expect(response.body).not.toHaveProperty("stack");
    expect(response.body).not.toHaveProperty("db");
  });
});

