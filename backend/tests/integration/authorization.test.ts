import { describe, it, expect, afterEach, afterAll, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";
import { Role } from "@prisma/client";
import { prisma } from "../../src/lib/prisma.js";
import { probeApp, realApp } from "../helpers/testApp.js";
import { createTestUser, cleanupTestData, TEST_PASSWORD } from "../helpers/users.js";

async function tokenFor(role: Role) {
  const user = await createTestUser(role);
  const res = await request(realApp)
    .post("/api/auth/login")
    .send({ username: user.username, password: TEST_PASSWORD });
  return { user, token: res.body.token as string };
}
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

afterEach(async () => {
  vi.useRealTimers();
  await cleanupTestData();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("401 on protected routes (F-02, AC-10)", () => {
  it("TEST-16: protected routes return 401 UNAUTHENTICATED without a token and leak nothing", async () => {
    const targets: Array<[string, string, typeof realApp]> = [
      ["get", "/api/auth/me", realApp],
      ["post", "/api/auth/logout", realApp],
      ["get", "/probe/custodian-only", probeApp],
      ["get", "/probe/borrower-only", probeApp],
    ];
    for (const [method, path, app] of targets) {
      const res = await (request(app) as any)[method](path);
      expect(res.status, `${method} ${path}`).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
      expect(JSON.stringify(res.body)).not.toMatch(/stack|prisma|password/i);
    }
  });

  it("TEST-17: an expired token and a revoked token are both rejected with 401", async () => {
    const revoked = await tokenFor(Role.BORROWER);
    await request(realApp).post("/api/auth/logout").set(bearer(revoked.token));
    const afterLogout = await request(probeApp).get("/probe/borrower-only").set(bearer(revoked.token));
    expect(afterLogout.status).toBe(401);

    const expired = await tokenFor(Role.BORROWER);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(Date.now() + 61 * 60 * 1000));
    const afterExpiry = await request(probeApp).get("/probe/borrower-only").set(bearer(expired.token));
    expect(afterExpiry.status).toBe(401);
  });
});

describe("403 by role (F-02, AC-11, AC-12)", () => {
  it("TEST-18: a borrower on a custodian-only route gets 403 FORBIDDEN_ROLE", async () => {
    const { token } = await tokenFor(Role.BORROWER);
    const res = await request(probeApp).get("/probe/custodian-only").set(bearer(token));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("TEST-20: a custodian on a borrower-only route gets 403 FORBIDDEN_ROLE", async () => {
    const { token } = await tokenFor(Role.CUSTODIAN);
    const res = await request(probeApp).get("/probe/borrower-only").set(bearer(token));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("an allowed role passes (guards against a middleware that rejects everyone)", async () => {
    const { token } = await tokenFor(Role.CUSTODIAN);
    const res = await request(probeApp).get("/probe/custodian-only").set(bearer(token));
    expect(res.status).toBe(200);
  });
});

describe("Errors (F-02, AC-16, AC-17)", () => {
  it("TEST-27: an unexpected failure returns 500 INTERNAL_ERROR without stack, SQL or path", async () => {
    const { token } = await tokenFor(Role.BORROWER);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(probeApp).get("/probe/boom").set(bearer(token));
    errSpy.mockRestore();

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(/SELECT|secret|\.ts|stack/i);
  });

  it("TEST-28: a malformed id returns 422 and an unknown route returns 404 in the standard format", async () => {
    const { token } = await tokenFor(Role.BORROWER);
    const malformed = await request(probeApp).get("/probe/record/not-a-uuid").set(bearer(token));
    expect(malformed.status).toBe(422);
    expect(malformed.body.error.code).toBe("VALIDATION_ERROR");

    const valid = await request(probeApp).get(`/probe/record/${randomUUID()}`).set(bearer(token));
    expect(valid.status).toBe(200);

    const unknown = await request(realApp).get("/api/does-not-exist");
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe("NOT_FOUND");
  });
});

describe("Role read from the database (F-02, AC-18)", () => {
  it("TEST-29: a role change takes effect on the next request with the same token", async () => {
    const { user, token } = await tokenFor(Role.BORROWER);

    const before = await request(probeApp).get("/probe/custodian-only").set(bearer(token));
    expect(before.status).toBe(403);

    await prisma.user.update({ where: { id: user.id }, data: { role: Role.CUSTODIAN } });

    const after = await request(probeApp).get("/probe/custodian-only").set(bearer(token));
    expect(after.status).toBe(200);
  });
});