import { describe, it, expect, afterEach, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";
import { ItemStatus, RequestStatus, Role, LoanStatus } from "@prisma/client";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { bearer, cleanupCheckoutData, createItem, createRequest, createUser, tokenOf } from "../helpers/checkout.js";

const checkout = (id: string, token?: string) => {
  const r = request(app).post(`/api/requests/${id}/checkout`);
  return token ? r.set(bearer(token)) : r;
};

async function setup() {
  const custodian = await createUser(Role.CUSTODIAN);
  const borrower = await createUser(Role.BORROWER);
  const item = await createItem(custodian.id);
  const pending = await createRequest(item.id, borrower.id);
  return { custodian, borrower, item, pending, custodianToken: await tokenOf(custodian) };
}

afterEach(cleanupCheckoutData);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/requests/:id/checkout (F-05)", () => {
  it("TEST-58: managing custodian checks out a PENDING request: 201, ACTIVE loan, FULFILLED request, ON_LOAN item (AC-37)", async () => {
    const s = await setup();
    const res = await checkout(s.pending.id, s.custodianToken);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: "ACTIVE",
      borrowerId: s.borrower.id,
      itemId: s.item.id,
      requestId: s.pending.id,
      custodianId: s.custodian.id,
    });
    const request_ = await prisma.loanRequest.findUnique({ where: { id: s.pending.id } });
    const item = await prisma.item.findUnique({ where: { id: s.item.id } });
    expect(request_?.status).toBe(RequestStatus.FULFILLED);
    expect(request_?.fulfilledAt).not.toBeNull();
    expect(item?.status).toBe(ItemStatus.ON_LOAN);
  });

  it("TEST-59: another custodian gets 404 and nothing changes (AC-38)", async () => {
    const s = await setup();
    const other = await createUser(Role.CUSTODIAN);
    const res = await checkout(s.pending.id, await tokenOf(other));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.message).toBe("Request not found");
    expect((await prisma.loanRequest.findUnique({ where: { id: s.pending.id } }))?.status).toBe(RequestStatus.PENDING);
    expect((await prisma.item.findUnique({ where: { id: s.item.id } }))?.status).toBe(ItemStatus.AVAILABLE);
    expect(await prisma.loan.count({ where: { itemId: s.item.id } })).toBe(0);
  });

  it("TEST-60: a borrower gets 403 FORBIDDEN_ROLE and nothing changes (AC-39)", async () => {
    const s = await setup();
    const res = await checkout(s.pending.id, await tokenOf(s.borrower));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    expect((await prisma.loanRequest.findUnique({ where: { id: s.pending.id } }))?.status).toBe(RequestStatus.PENDING);
  });

  it("TEST-61: no token returns 401 UNAUTHENTICATED (AC-39, NFR-01)", async () => {
    const s = await setup();
    const res = await checkout(s.pending.id);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("TEST-62: an already FULFILLED request returns 409 REQUEST_NOT_PENDING, no second loan (AC-40)", async () => {
    const s = await setup();
    const fulfilled = await createRequest(s.item.id, s.borrower.id, RequestStatus.FULFILLED);
    const res = await checkout(fulfilled.id, s.custodianToken);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("REQUEST_NOT_PENDING");
    expect(await prisma.loan.count({ where: { itemId: s.item.id } })).toBe(0);
  });

  it("TEST-63: an ON_LOAN item returns 409 ITEM_UNAVAILABLE and the request stays PENDING (AC-41)", async () => {
    const s = await setup();
    await prisma.item.update({ where: { id: s.item.id }, data: { status: ItemStatus.ON_LOAN } });
    const res = await checkout(s.pending.id, s.custodianToken);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ITEM_UNAVAILABLE");
    const request_ = await prisma.loanRequest.findUnique({ where: { id: s.pending.id } });
    expect(request_?.status).toBe(RequestStatus.PENDING);
    expect(request_?.fulfilledAt).toBeNull();
    expect(await prisma.loan.count({ where: { itemId: s.item.id } })).toBe(0);
  });

  it("TEST-66: a malformed id returns 422 VALIDATION_ERROR (AC-45, boundary)", async () => {
    const s = await setup();
    const res = await checkout("not-a-valid-uuid", s.custodianToken);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("TEST-67: an unknown UUID returns 404 'Request not found' (AC-45)", async () => {
    const s = await setup();
    const res = await checkout(randomUUID(), s.custodianToken);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.message).toBe("Request not found");
  });
});

describe("Concurrent checkouts (F-05, BR-05)", () => {
  it("TEST-68: two requests on the same item checked out concurrently: one 201, one 409, one ACTIVE loan (AC-42)", async () => {
    const s = await setup();
    const borrower2 = await createUser(Role.BORROWER);
    const second = await createRequest(s.item.id, borrower2.id);

    const results = await Promise.all([
      checkout(s.pending.id, s.custodianToken),
      checkout(second.id, s.custodianToken),
    ]);
    const statuses = results.map((r) => r.status).sort();

    expect(statuses).toEqual([201, 409]);
    const loser = results.find((r) => r.status === 409)!;
    expect(["ITEM_UNAVAILABLE", "ACTIVE_LOAN_EXISTS"]).toContain(loser.body.error.code);
    expect(await prisma.loan.count({ where: { itemId: s.item.id, status: LoanStatus.ACTIVE } })).toBe(1);
    expect((await prisma.item.findUnique({ where: { id: s.item.id } }))?.status).toBe(ItemStatus.ON_LOAN);
  });

  it("TEST-69: the same request checked out twice concurrently: one 201, one 409 REQUEST_NOT_PENDING (AC-42)", async () => {
    const s = await setup();
    const results = await Promise.all([
      checkout(s.pending.id, s.custodianToken),
      checkout(s.pending.id, s.custodianToken),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(results.find((r) => r.status === 409)!.body.error.code).toBe("REQUEST_NOT_PENDING");
    expect(await prisma.loan.count({ where: { requestId: s.pending.id } })).toBe(1);
  });
});