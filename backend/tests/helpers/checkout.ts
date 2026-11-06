import argon2 from "argon2";
import { randomUUID } from "crypto";
import request from "supertest";
import { ItemStatus, RequestStatus, Role } from "@prisma/client";
import { prisma } from "../../src/lib/prisma.js";
import { app } from "../../src/app.js";

export const TEST_PASSWORD = "Test-Password-2026!";
const PREFIX = "f05_";
const TAG_PREFIX = "EQ-F05-";

// Hash once per test run and reuse it: argon2 is deliberately slow.
// Login still verifies with the real argon2id code path.
let cachedHash: string | undefined;
async function testHash() {
  cachedHash ??= await argon2.hash(TEST_PASSWORD);
  return cachedHash;
}

export async function createUser(role: Role) {
  return prisma.user.create({
    data: {
      username: `${PREFIX}${role.toLowerCase()}_${randomUUID().slice(0, 8)}`,
      passwordHash: await testHash(),
      displayName: `F05 ${role}`,
      role,
    },
  });
}

export async function tokenOf(user: { username: string }) {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ username: user.username, password: TEST_PASSWORD });
  return res.body.token as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export function createItem(managedBy: string, status: ItemStatus = ItemStatus.AVAILABLE) {
  return prisma.item.create({
    data: {
      assetTag: `${TAG_PREFIX}${randomUUID().slice(0, 8)}`,
      name: "F05 test item",
      status,
      managedBy,
    },
  });
}

export function createRequest(itemId: string, borrowerId: string, status: RequestStatus = RequestStatus.PENDING) {
  return prisma.loanRequest.create({ data: { itemId, borrowerId, status } });
}

export async function cleanupCheckoutData() {
  const users = await prisma.user.findMany({
    where: { username: { startsWith: PREFIX } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (ids.length === 0) return;
  const managed = { item: { managedBy: { in: ids } } };
  await prisma.loan.deleteMany({
    where: { OR: [{ borrowerId: { in: ids } }, { custodianId: { in: ids } }, managed] },
  });
  await prisma.loanRequest.deleteMany({ where: { OR: [{ borrowerId: { in: ids } }, managed] } });
  await prisma.item.deleteMany({ where: { managedBy: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}