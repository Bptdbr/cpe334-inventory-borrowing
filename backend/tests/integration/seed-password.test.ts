import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { seed } from "../../prisma/seed.js";
import { prisma } from "../../src/lib/prisma.js";

describe("Seeded accounts store hashed passwords (F-01, AC-08)", () => {
  beforeAll(async () => {
    await seed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("TEST-02: seeded password_hash differs from SEED_DEMO_PASSWORD and is an argon2id hash", async () => {
    const plain = process.env.SEED_DEMO_PASSWORD as string;
    expect(plain).toBeTruthy();

    const users = await prisma.user.findMany({
      where: { username: { in: ["borrower1", "borrower2", "custodian1", "custodian2"] } },
    });

    expect(users).toHaveLength(4);
    for (const user of users) {
      expect(user.passwordHash).not.toBe(plain);
      expect(user.passwordHash.startsWith("$argon2id$")).toBe(true);
    }
  });
});