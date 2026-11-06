import { describe, it, expect, afterEach, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";
import { Role, ItemStatus } from "@prisma/client";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import {
  getAuthToken,
  createTestItem,
  cleanupCatalogTestData,
} from "../helpers/catalog.js";

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

afterEach(async () => {
  await cleanupCatalogTestData();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Borrow Requests API - POST /api/requests (F-04, AC-29 to AC-35)", () => {
  it("TEST-46: borrower creates a PENDING request on an AVAILABLE item (AC-29, FR-06)", async () => {
    const { user: custodian } = await getAuthToken(Role.CUSTODIAN);
    const item = await createTestItem(custodian.id, { status: ItemStatus.AVAILABLE });

    const { token: borrowerToken, user: borrower } = await getAuthToken(Role.BORROWER);

    const res = await request(app)
      .post("/api/requests")
      .set(bearer(borrowerToken))
      .send({ itemId: item.id });

    expect(res.status).toBe(201);
    expect(res.body.itemId).toBe(item.id);
    expect(res.body.borrowerId).toBe(borrower.id);
    expect(res.body.status).toBe("PENDING");
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.fulfilledAt).toBeNull();

    // Verify row in database
    const dbReq = await prisma.loanRequest.findUnique({ where: { id: res.body.id } });
    expect(dbReq).not.toBeNull();
    expect(dbReq?.status).toBe("PENDING");
    expect(dbReq?.borrowerId).toBe(borrower.id);
  });

  it("TEST-47: borrowerId in body is ignored, taken from token (AC-29, NFR-01)", async () => {
    const { user: custodian } = await getAuthToken(Role.CUSTODIAN);
    const item = await createTestItem(custodian.id);
    const { token: borrowerToken, user: borrower } = await getAuthToken(Role.BORROWER);
    const fakeBorrowerId = randomUUID();

    const res = await request(app)
      .post("/api/requests")
      .set(bearer(borrowerToken))
      .send({ itemId: item.id, borrowerId: fakeBorrowerId });

    expect(res.status).toBe(201);
    expect(res.body.borrowerId).toBe(borrower.id);
    expect(res.body.borrowerId).not.toBe(fakeBorrowerId);
  });

  it("TEST-48: requesting an ON_LOAN item returns 409 ITEM_UNAVAILABLE (AC-30, BR-02)", async () => {
    const { user: custodian } = await getAuthToken(Role.CUSTODIAN);
    const item = await createTestItem(custodian.id, { status: ItemStatus.ON_LOAN });

    const { token: borrowerToken } = await getAuthToken(Role.BORROWER);

    const res = await request(app)
      .post("/api/requests")
      .set(bearer(borrowerToken))
      .send({ itemId: item.id });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ITEM_UNAVAILABLE");
    expect(res.body.error.message).toMatch(/not available/i);

    // Verify no request created
    const count = await prisma.loanRequest.count({ where: { itemId: item.id } });
    expect(count).toBe(0);
  });

  it("TEST-49: duplicate PENDING request by same borrower returns 409 DUPLICATE_PENDING_REQUEST (AC-31, BR-06)", async () => {
    const { user: custodian } = await getAuthToken(Role.CUSTODIAN);
    const item = await createTestItem(custodian.id, { status: ItemStatus.AVAILABLE });

    const { token: borrowerToken, user: borrower } = await getAuthToken(Role.BORROWER);

    // First request succeeds
    const firstRes = await request(app)
      .post("/api/requests")
      .set(bearer(borrowerToken))
      .send({ itemId: item.id });
    expect(firstRes.status).toBe(201);

    // Second request returns 409
    const secondRes = await request(app)
      .post("/api/requests")
      .set(bearer(borrowerToken))
      .send({ itemId: item.id });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error.code).toBe("DUPLICATE_PENDING_REQUEST");

    // Total requests for this item and borrower remains 1
    const count = await prisma.loanRequest.count({
      where: { itemId: item.id, borrowerId: borrower.id },
    });
    expect(count).toBe(1);
  });

  it("TEST-51: two different borrowers can each request the same AVAILABLE item (AC-32, D-05)", async () => {
    const { user: custodian } = await getAuthToken(Role.CUSTODIAN);
    const item = await createTestItem(custodian.id, { status: ItemStatus.AVAILABLE });

    const { token: token1 } = await getAuthToken(Role.BORROWER);
    const { token: token2 } = await getAuthToken(Role.BORROWER);

    const res1 = await request(app).post("/api/requests").set(bearer(token1)).send({ itemId: item.id });
    const res2 = await request(app).post("/api/requests").set(bearer(token2)).send({ itemId: item.id });

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    expect(res1.body.id).not.toBe(res2.body.id);
  });

  it("TEST-52: custodian cannot request items and receives 403 FORBIDDEN_ROLE (AC-33, BR-03)", async () => {
    const { token: custodianToken } = await getAuthToken(Role.CUSTODIAN);

    const res = await request(app)
      .post("/api/requests")
      .set(bearer(custodianToken))
      .send({ itemId: randomUUID() });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("TEST-53: requesting a non-existent item returns 404 NOT_FOUND (AC-34)", async () => {
    const { token: borrowerToken } = await getAuthToken(Role.BORROWER);

    const res = await request(app)
      .post("/api/requests")
      .set(bearer(borrowerToken))
      .send({ itemId: randomUUID() });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("TEST-54 & TEST-55: validation rejects malformed UUID or missing itemId with 422 (AC-35)", async () => {
    const { token: borrowerToken } = await getAuthToken(Role.BORROWER);

    // Malformed UUID
    const resBadUuid = await request(app)
      .post("/api/requests")
      .set(bearer(borrowerToken))
      .send({ itemId: "not-a-valid-uuid" });
    expect(resBadUuid.status).toBe(422);
    expect(resBadUuid.body.error.code).toBe("VALIDATION_ERROR");

    // Missing body
    const resEmpty = await request(app)
      .post("/api/requests")
      .set(bearer(borrowerToken))
      .send({});
    expect(resEmpty.status).toBe(422);
    expect(resEmpty.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("TEST-56: unauthenticated POST /api/requests returns 401 UNAUTHENTICATED", async () => {
    const res = await request(app).post("/api/requests").send({ itemId: randomUUID() });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("Borrower Consultation API - GET /api/requests/mine (F-06, AC-47, AC-54)", () => {
  it("TEST-74: borrower retrieves own requests and never sees requests of others (AC-47, BR-04)", async () => {
    const { user: custodian } = await getAuthToken(Role.CUSTODIAN);
    const item1 = await createTestItem(custodian.id);
    const item2 = await createTestItem(custodian.id);

    const { token: tokenA, user: borrowerA } = await getAuthToken(Role.BORROWER);
    const { token: tokenB, user: borrowerB } = await getAuthToken(Role.BORROWER);

    // Borrower A requests item1
    await request(app).post("/api/requests").set(bearer(tokenA)).send({ itemId: item1.id });
    // Borrower B requests item2
    await request(app).post("/api/requests").set(bearer(tokenB)).send({ itemId: item2.id });

    // Borrower A views own requests
    const resA = await request(app).get("/api/requests/mine").set(bearer(tokenA));
    expect(resA.status).toBe(200);
    expect(resA.body).toHaveLength(1);
    expect(resA.body[0].itemId).toBe(item1.id);

    // Borrower B views own requests
    const resB = await request(app).get("/api/requests/mine").set(bearer(tokenB));
    expect(resB.status).toBe(200);
    expect(resB.body).toHaveLength(1);
    expect(resB.body[0].itemId).toBe(item2.id);
  });

  it("TEST-75: requests/mine includes item details (id, assetTag, name) (AC-47)", async () => {
    const { user: custodian } = await getAuthToken(Role.CUSTODIAN);
    const item = await createTestItem(custodian.id, {
      assetTag: "EQ-TEST-DETAILS",
      name: "Detail Item",
    });

    const { token } = await getAuthToken(Role.BORROWER);
    await request(app).post("/api/requests").set(bearer(token)).send({ itemId: item.id });

    const res = await request(app).get("/api/requests/mine").set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body[0].item).toEqual({
      id: item.id,
      assetTag: "EQ-TEST-DETAILS",
      name: "Detail Item",
    });
  });

  it("TEST-86: fresh borrower receives 200 OK with empty array [] (AC-54)", async () => {
    const { token } = await getAuthToken(Role.BORROWER);

    const res = await request(app).get("/api/requests/mine").set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("custodian calling GET /api/requests/mine receives 403 FORBIDDEN_ROLE", async () => {
    const { token: custodianToken } = await getAuthToken(Role.CUSTODIAN);
    const res = await request(app).get("/api/requests/mine").set(bearer(custodianToken));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
  });
});
