import { describe, it, expect, afterEach, afterAll } from "vitest";
import request from "supertest";
import { RequestStatus, Role } from "@prisma/client";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import {
  bearer, cleanupCheckoutData, createItem, createLoan, createRequest, createUser, tokenOf,
} from "../helpers/checkout.js";

const get = (path: string, token?: string) => {
  const r = request(app).get(path);
  return token ? r.set(bearer(token)) : r;
};

// One custodian with one item, one borrower with a fulfilled request and an ACTIVE loan.
async function world() {
  const custodian = await createUser(Role.CUSTODIAN);
  const borrower = await createUser(Role.BORROWER);
  const item = await createItem(custodian.id);
  const req = await createRequest(item.id, borrower.id, RequestStatus.FULFILLED);
  const loan = await createLoan(item.id, borrower.id, req.id, custodian.id);
  return {
    custodian, borrower, item, req, loan,
    custodianToken: await tokenOf(custodian),
    borrowerToken: await tokenOf(borrower),
  };
}

afterEach(cleanupCheckoutData);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/loans/mine (F-06, AC-48)", () => {
  it("TEST-76: borrower gets own ACTIVE loan with nested item, never another borrower's (AC-48, BR-04)", async () => {
    const w = await world();
    const other = await createUser(Role.BORROWER);
    const otherItem = await createItem(w.custodian.id);
    const otherReq = await createRequest(otherItem.id, other.id, RequestStatus.FULFILLED);
    await createLoan(otherItem.id, other.id, otherReq.id, w.custodian.id);

    const res = await get("/api/loans/mine", w.borrowerToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: w.loan.id,
      itemId: w.item.id,
      requestId: w.req.id,
      custodianId: w.custodian.id,
      status: "ACTIVE",
      item: { id: w.item.id, assetTag: w.item.assetTag, name: w.item.name },
    });
    expect(typeof res.body[0].checkedOutAt).toBe("string");
  });

  it("TEST-77: borrower without loans gets 200 and [] (AC-48, AC-54)", async () => {
    const fresh = await createUser(Role.BORROWER);
    const res = await get("/api/loans/mine", await tokenOf(fresh));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /api/requests (custodian scope, F-06, AC-49)", () => {
  it("TEST-78: custodian sees requests of managed items with borrower details, not other custodians' (AC-49, BR-03)", async () => {
    const w = await world();
    const otherCustodian = await createUser(Role.CUSTODIAN);
    const otherBorrower = await createUser(Role.BORROWER);
    const foreignItem = await createItem(otherCustodian.id);
    const foreignReq = await createRequest(foreignItem.id, otherBorrower.id);

    const res = await get("/api/requests", w.custodianToken);

    expect(res.status).toBe(200);
    const ids = res.body.map((r: { id: string }) => r.id);
    expect(ids).toContain(w.req.id);
    expect(ids).not.toContain(foreignReq.id);
    const mine = res.body.find((r: { id: string }) => r.id === w.req.id);
    expect(mine.borrower).toEqual({
      id: w.borrower.id,
      username: w.borrower.username,
      displayName: w.borrower.displayName,
    });
    expect(mine.item).toMatchObject({ id: w.item.id, assetTag: w.item.assetTag, name: w.item.name });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });
});

describe("GET /api/loans (custodian scope, F-06, AC-50)", () => {
  it("TEST-79: custodian sees ACTIVE loans of managed items, not other custodians' (AC-50, BR-03)", async () => {
    const w = await world();
    const otherCustodian = await createUser(Role.CUSTODIAN);
    const otherBorrower = await createUser(Role.BORROWER);
    const foreignItem = await createItem(otherCustodian.id);
    const foreignReq = await createRequest(foreignItem.id, otherBorrower.id, RequestStatus.FULFILLED);
    const foreignLoan = await createLoan(foreignItem.id, otherBorrower.id, foreignReq.id, otherCustodian.id);

    const res = await get("/api/loans", w.custodianToken);

    expect(res.status).toBe(200);
    const ids = res.body.map((l: { id: string }) => l.id);
    expect(ids).toContain(w.loan.id);
    expect(ids).not.toContain(foreignLoan.id);
    const mine = res.body.find((l: { id: string }) => l.id === w.loan.id);
    expect(mine).toMatchObject({
      status: "ACTIVE",
      borrowerId: w.borrower.id,
      borrower: { id: w.borrower.id, username: w.borrower.username },
      item: { id: w.item.id, assetTag: w.item.assetTag },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it("TEST-80: custodian without active loans gets 200 and [] (AC-50, AC-54)", async () => {
    const custodian = await createUser(Role.CUSTODIAN);
    const res = await get("/api/loans", await tokenOf(custodian));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("Role restrictions and authentication (F-06, AC-51 to AC-53)", () => {
  it("TEST-81: borrower on GET /api/requests gets 403 FORBIDDEN_ROLE, no records (AC-51)", async () => {
    const w = await world();
    const res = await get("/api/requests", w.borrowerToken);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    expect(Array.isArray(res.body)).toBe(false);
  });

  it("TEST-82: borrower on GET /api/loans gets 403 FORBIDDEN_ROLE, no records (AC-51)", async () => {
    const w = await world();
    const res = await get("/api/loans", w.borrowerToken);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    expect(Array.isArray(res.body)).toBe(false);
  });

  it("TEST-83: custodian on GET /api/requests/mine gets 403 FORBIDDEN_ROLE (AC-52)", async () => {
    const w = await world();
    const res = await get("/api/requests/mine", w.custodianToken);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("TEST-84: custodian on GET /api/loans/mine gets 403 FORBIDDEN_ROLE (AC-52)", async () => {
    const w = await world();
    const res = await get("/api/loans/mine", w.custodianToken);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("TEST-85: the four consultation endpoints return 401 UNAUTHENTICATED without a token (AC-53, NFR-01)", async () => {
    for (const path of ["/api/requests/mine", "/api/requests", "/api/loans/mine", "/api/loans"]) {
      const res = await get(path);
      expect(res.status, path).toBe(401);
      expect(res.body.error.code, path).toBe("UNAUTHENTICATED");
    }
  });
});