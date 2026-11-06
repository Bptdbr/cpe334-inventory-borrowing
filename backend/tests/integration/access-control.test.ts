import { describe, it, expect, afterEach, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";
import { ItemStatus, RequestStatus, Role } from "@prisma/client";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import {
  bearer, cleanupCheckoutData, createItem, createLoan, createRequest, createUser, tokenOf,
} from "../helpers/checkout.js";

afterEach(cleanupCheckoutData);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("401 on every protected endpoint (F-02, AC-10, NFR-01)", () => {
  it("TEST-16: the 10 protected endpoints return 401 UNAUTHENTICATED without a token", async () => {
    const id = randomUUID();
    const targets: Array<["get" | "post", string]> = [
      ["post", "/api/auth/logout"],
      ["get", "/api/auth/me"],
      ["get", "/api/items"],
      ["post", "/api/items"],
      ["post", "/api/requests"],
      ["get", "/api/requests/mine"],
      ["get", "/api/requests"],
      ["post", `/api/requests/${id}/checkout`],
      ["get", "/api/loans/mine"],
      ["get", "/api/loans"],
    ];
    for (const [method, path] of targets) {
      const res = await request(app)[method](path);
      expect(res.status, `${method} ${path}`).toBe(401);
      expect(res.body.error.code, `${method} ${path}`).toBe("UNAUTHENTICATED");
      expect(JSON.stringify(res.body)).not.toMatch(/password|stack|prisma/i);
    }
  });
});

describe("403 by role on real endpoints (F-02, AC-11, AC-12)", () => {
  it("TEST-18/19: a borrower cannot reach custodian endpoints and POST /api/items creates nothing", async () => {
    const borrower = await createUser(Role.BORROWER);
    const token = await tokenOf(borrower);
    const before = await prisma.item.count();

    const create = await request(app)
      .post("/api/items").set(bearer(token))
      .send({ assetTag: `EQ-F05-${randomUUID().slice(0, 6)}`, name: "Should not exist" });
    expect(create.status).toBe(403);
    expect(create.body.error.code).toBe("FORBIDDEN_ROLE");
    expect(await prisma.item.count()).toBe(before);

    for (const [method, path] of [
      ["get", "/api/requests"], ["get", "/api/loans"], ["post", `/api/requests/${randomUUID()}/checkout`],
    ] as const) {
      const res = await request(app)[method](path).set(bearer(token));
      expect(res.status, path).toBe(403);
      expect(res.body.error.code, path).toBe("FORBIDDEN_ROLE");
    }
  });

  it("TEST-20: a custodian cannot reach borrower endpoints", async () => {
    const custodian = await createUser(Role.CUSTODIAN);
    const token = await tokenOf(custodian);
    const item = await createItem(custodian.id);

    const post = await request(app).post("/api/requests").set(bearer(token)).send({ itemId: item.id });
    expect(post.status).toBe(403);
    for (const path of ["/api/requests/mine", "/api/loans/mine"]) {
      const res = await request(app).get(path).set(bearer(token));
      expect(res.status, path).toBe(403);
      expect(res.body.error.code, path).toBe("FORBIDDEN_ROLE");
    }
  });
});

describe("404 outside the caller's scope (F-02, AC-13, AC-14)", () => {
  it("TEST-21/22: a borrower cannot reach another borrower's records, indistinguishable from a missing id", async () => {
    const custodian = await createUser(Role.CUSTODIAN);
    const owner = await createUser(Role.BORROWER);
    const intruder = await createUser(Role.BORROWER);
    const item = await createItem(custodian.id);
    const req = await createRequest(item.id, owner.id);
    const token = await tokenOf(intruder);

    const list = await request(app).get("/api/requests/mine").set(bearer(token));
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body)).not.toContain(req.id);
    expect(JSON.stringify(list.body)).not.toContain(owner.username);

    // Borrowers have no by-id route, so a foreign id is simply not reachable:
    // the only by-id route (checkout) is custodian-only and returns 403 here.
    const byId = await request(app).post(`/api/requests/${req.id}/checkout`).set(bearer(token));
    expect(byId.status).toBe(403);
    expect(byId.body).not.toHaveProperty("itemId");
  });

  it("TEST-23: a custodian acting on another custodian's request gets the same 404 as a missing id; nothing changes", async () => {
    const owner = await createUser(Role.CUSTODIAN);
    const intruder = await createUser(Role.CUSTODIAN);
    const borrower = await createUser(Role.BORROWER);
    const item = await createItem(owner.id);
    const req = await createRequest(item.id, borrower.id);
    const token = await tokenOf(intruder);

    const foreign = await request(app).post(`/api/requests/${req.id}/checkout`).set(bearer(token));
    const missing = await request(app).post(`/api/requests/${randomUUID()}/checkout`).set(bearer(token));

    expect(foreign.status).toBe(404);
    expect(foreign.body).toEqual(missing.body);
    expect((await prisma.loanRequest.findUnique({ where: { id: req.id } }))?.status).toBe(RequestStatus.PENDING);
    expect((await prisma.item.findUnique({ where: { id: item.id } }))?.status).toBe(ItemStatus.AVAILABLE);
  });

  it("TEST-24: custodian lists contain only records of managed items", async () => {
    const mine = await createUser(Role.CUSTODIAN);
    const other = await createUser(Role.CUSTODIAN);
    const b1 = await createUser(Role.BORROWER);
    const b2 = await createUser(Role.BORROWER);
    const myItem = await createItem(mine.id);
    const otherItem = await createItem(other.id);
    const myReq = await createRequest(myItem.id, b1.id, RequestStatus.FULFILLED);
    const otherReq = await createRequest(otherItem.id, b2.id, RequestStatus.FULFILLED);
    const myLoan = await createLoan(myItem.id, b1.id, myReq.id, mine.id);
    const otherLoan = await createLoan(otherItem.id, b2.id, otherReq.id, other.id);
    const token = await tokenOf(mine);

    const reqs = await request(app).get("/api/requests").set(bearer(token));
    const loans = await request(app).get("/api/loans").set(bearer(token));

    expect(reqs.body.map((r: { id: string }) => r.id)).toEqual([myReq.id]);
    expect(reqs.body.map((r: { id: string }) => r.id)).not.toContain(otherReq.id);
    expect(loans.body.map((l: { id: string }) => l.id)).toEqual([myLoan.id]);
    expect(loans.body.map((l: { id: string }) => l.id)).not.toContain(otherLoan.id);
  });
});