import argon2 from "argon2";
import { randomUUID } from "crypto";
import { Role, ItemStatus, Item } from "@prisma/client";
import request from "supertest";
import { prisma } from "../../src/lib/prisma.js";
import { app } from "../../src/app.js";

export const TEST_PASSWORD = "Test-Password-2026!";
const PREFIX = "f03_";

export async function createCatalogTestUser(role: Role) {
  const username = `${PREFIX}${role.toLowerCase()}_${randomUUID().slice(0, 8)}`;
  return prisma.user.create({
    data: {
      username,
      passwordHash: await argon2.hash(TEST_PASSWORD),
      displayName: `Catalog Test ${role}`,
      role,
    },
  });
}

export async function getAuthToken(role: Role) {
  const user = await createCatalogTestUser(role);
  const res = await request(app)
    .post("/api/auth/login")
    .send({ username: user.username, password: TEST_PASSWORD });
  return { user, token: res.body.token as string };
}

export async function createTestItem(custodianId: string, overrides: Partial<Item> = {}) {
  const tagSuffix = randomUUID().slice(0, 6);
  return prisma.item.create({
    data: {
      assetTag: overrides.assetTag ?? `EQ-TEST-${tagSuffix}`,
      name: overrides.name ?? "Test Oscilloscope",
      description: overrides.description ?? "Test description",
      status: overrides.status ?? ItemStatus.AVAILABLE,
      managedBy: custodianId,
    },
  });
}

export async function cleanupCatalogTestData() {
  // Delete requests and loans created for our test items or test users
  const testUsers = await prisma.user.findMany({
    where: { username: { startsWith: PREFIX } },
    select: { id: true },
  });
  const userIds = testUsers.map((u) => u.id);

  if (userIds.length > 0) {
    await prisma.loan.deleteMany({
      where: {
        OR: [{ borrowerId: { in: userIds } }, { custodianId: { in: userIds } }],
      },
    });
    await prisma.loanRequest.deleteMany({
      where: { borrowerId: { in: userIds } },
    });
    await prisma.item.deleteMany({
      where: { managedBy: { in: userIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
  }

  // Also clean up any items tagged with EQ-TEST-
  await prisma.item.deleteMany({
    where: { assetTag: { startsWith: "EQ-TEST-" } },
  });
}
