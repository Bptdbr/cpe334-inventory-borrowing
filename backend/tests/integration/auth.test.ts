import { describe, it, expect, afterEach, afterAll } from "vitest";
import { vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { Role } from "@prisma/client";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { createTestUser, cleanupTestData, TEST_PASSWORD } from "../helpers/users.js";

const login = (username: string, password: string) =>
  request(app).post("/api/auth/login").send({ username, password });

async function loginToken(role: Role) {
  const user = await createTestUser(role);
  const res = await login(user.username, TEST_PASSWORD);
  return { user, token: res.body.token as string, res };
}

afterEach(async () => {
  vi.useRealTimers();
  await cleanupTestData();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/auth/login (F-01)", () => {
  it("TEST-03: valid credentials return 200 with token, expiresAt and user, without password data (AC-01, AC-08)", async () => {
    const user = await createTestUser(Role.BORROWER);
    const res = await login(user.username, TEST_PASSWORD);

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user).toEqual({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: "BORROWER",
    });
    const msUntilExpiry = new Date(res.body.expiresAt).getTime() - Date.now();
    expect(Math.abs(msUntilExpiry - 60 * 60 * 1000)).toBeLessThan(5000);
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it("TEST-04: token has sub, jti, iat, exp, lasts 60 minutes and carries no role (AC-01)", async () => {
    const { user, token } = await loginToken(Role.BORROWER);
    const payload = jwt.decode(token) as Record<string, unknown>;

    expect(payload.sub).toBe(user.id);
    expect(typeof payload.jti).toBe("string");
    expect(typeof payload.iat).toBe("number");
    expect(typeof payload.exp).toBe("number");
    expect((payload.exp as number) - (payload.iat as number)).toBe(60 * 60);
    expect(payload).not.toHaveProperty("role");
  });

  it("TEST-05: wrong password returns 401 INVALID_CREDENTIALS and no token (AC-02)", async () => {
    const user = await createTestUser(Role.BORROWER);
    const res = await login(user.username, "not-the-password");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(res.body).not.toHaveProperty("token");
  });

  it("TEST-06: unknown username returns exactly the same response as a wrong password (AC-02)", async () => {
    const user = await createTestUser(Role.BORROWER);
    const wrongPassword = await login(user.username, "not-the-password");
    const unknownUser = await login(`f01_nobody_${randomUUID().slice(0, 8)}`, "not-the-password");

    expect(unknownUser.status).toBe(wrongPassword.status);
    expect(unknownUser.body).toEqual(wrongPassword.body);
  });

  it("TEST-07: missing password returns 422 VALIDATION_ERROR and no token (AC-03)", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "someone" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body).not.toHaveProperty("token");
  });

  it("TEST-08: empty and 51-character usernames return 422 (AC-03, boundary)", async () => {
    const empty = await login("", "whatever");
    const tooLong = await login("a".repeat(51), "whatever");

    expect(empty.status).toBe(422);
    expect(tooLong.status).toBe(422);
  });
});

describe("GET /api/auth/me and POST /api/auth/logout (F-01)", () => {
  it("TEST-09: /me returns the caller's identity and role (AC-04)", async () => {
    const { user, token } = await loginToken(Role.CUSTODIAN);
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: "CUSTODIAN",
    });
  });

  it("TEST-10: logout returns 204 and stores the token jti in revoked_tokens (AC-05)", async () => {
    const { token } = await loginToken(Role.BORROWER);
    const jti = (jwt.decode(token) as { jti: string }).jti;

    const res = await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
    const revoked = await prisma.revokedToken.findUnique({ where: { jti } });
    expect(revoked).not.toBeNull();
  });

  it("TEST-11: a token used after logout is rejected with 401 UNAUTHENTICATED (AC-05)", async () => {
    const { token } = await loginToken(Role.BORROWER);
    await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${token}`);

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("TEST-12: a token past its 60-minute expiry is rejected with 401 (AC-06)", async () => {
    const { token } = await loginToken(Role.BORROWER);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(Date.now() + 61 * 60 * 1000));

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("TEST-13: missing, malformed and wrongly signed tokens return 401 without private data (AC-07)", async () => {
    const user = await createTestUser(Role.BORROWER);
    const forged = jwt.sign(
      { sub: user.id, jti: randomUUID() },
      "another-secret-another-secret-another-secret-1",
      { expiresIn: "60m" },
    );

    const noHeader = await request(app).get("/api/auth/me");
    const garbage = await request(app).get("/api/auth/me").set("Authorization", "Bearer garbage");
    const wrongSecret = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${forged}`);

    for (const res of [noHeader, garbage, wrongSecret]) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
      expect(JSON.stringify(res.body)).not.toContain(user.username);
    }
  });

  it("TEST-14: a valid token of a deleted user is rejected with 401 (AC-07)", async () => {
    const { user, token } = await loginToken(Role.BORROWER);
    await prisma.user.delete({ where: { id: user.id } });

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
});