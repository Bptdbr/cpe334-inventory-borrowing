import argon2 from "argon2";
import { randomUUID } from "crypto";
import { Role } from "@prisma/client";
import { prisma } from "../../src/lib/prisma.js";

export const TEST_PASSWORD = "Test-Password-2026!";
const PREFIX = "f01_";

// Creates a user directly in inventory_test (never through the code under test).
export async function createTestUser(role: Role) {
  const username = `${PREFIX}${role.toLowerCase()}_${randomUUID().slice(0, 8)}`;
  return prisma.user.create({
    data: {
      username,
      passwordHash: await argon2.hash(TEST_PASSWORD),
      displayName: `Test ${role}`,
      role,
    },
  });
}

// Safe because setup-env.ts refuses to run on any database other than inventory_test.
export async function cleanupTestData() {
  await prisma.user.deleteMany({ where: { username: { startsWith: PREFIX } } });
  await prisma.revokedToken.deleteMany({});
}