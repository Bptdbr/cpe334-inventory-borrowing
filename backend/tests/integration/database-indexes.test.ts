import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Role, ItemStatus, RequestStatus, LoanStatus } from "@prisma/client";
import { prisma } from "../../src/lib/prisma.js";

const PREFIX = "f09_";

describe("Database Constraints and Partial Indexes (TEST-50, TEST-64, TEST-65)", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup records created during database-indexes tests
    const testUsers = await prisma.user.findMany({
      where: { username: { startsWith: PREFIX } },
      select: { id: true },
    });
    const userIds = testUsers.map((u) => u.id);

    if (userIds.length > 0) {
      await prisma.loan.deleteMany({
        where: { OR: [{ borrowerId: { in: userIds } }, { custodianId: { in: userIds } }] },
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

    await prisma.$disconnect();
  });

  it("TEST-50: rejects duplicate PENDING request for same borrower and item via partial index", async () => {
    const testUser = await prisma.user.create({
      data: {
        username: `${PREFIX}borrower_${Date.now()}`,
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$dummyhashforunittesting",
        displayName: "Test Borrower",
        role: Role.BORROWER,
      },
    });

    const testCustodian = await prisma.user.create({
      data: {
        username: `${PREFIX}custodian_${Date.now()}`,
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$dummyhashforunittesting",
        displayName: "Test Custodian",
        role: Role.CUSTODIAN,
      },
    });

    const testItem = await prisma.item.create({
      data: {
        assetTag: `TEST-TAG-${Date.now()}`,
        name: "Index Test Item",
        status: ItemStatus.AVAILABLE,
        managedBy: testCustodian.id,
      },
    });

    await prisma.loanRequest.create({
      data: {
        itemId: testItem.id,
        borrowerId: testUser.id,
        status: RequestStatus.PENDING,
      },
    });

    let errorThrown = false;
    try {
      await prisma.loanRequest.create({
        data: {
          itemId: testItem.id,
          borrowerId: testUser.id,
          status: RequestStatus.PENDING,
        },
      });
    } catch (e: any) {
      errorThrown = true;
      expect(e.code === "P2002" || e.message?.includes("unique") || e.message?.includes("idx_loan_requests_pending_unique")).toBe(true);
    }

    expect(errorThrown).toBe(true);
  });

  it("TEST-64: rejects duplicate ACTIVE loan for same item via partial index", async () => {
    const testCustodian = await prisma.user.create({
      data: {
        username: `${PREFIX}cust_loan_${Date.now()}`,
        passwordHash: "$argon2id$dummy",
        displayName: "Custodian Loan",
        role: Role.CUSTODIAN,
      },
    });

    const testBorrower1 = await prisma.user.create({
      data: {
        username: `${PREFIX}borr1_${Date.now()}`,
        passwordHash: "$argon2id$dummy",
        displayName: "Borrower 1",
        role: Role.BORROWER,
      },
    });

    const testBorrower2 = await prisma.user.create({
      data: {
        username: `${PREFIX}borr2_${Date.now()}`,
        passwordHash: "$argon2id$dummy",
        displayName: "Borrower 2",
        role: Role.BORROWER,
      },
    });

    const testItem = await prisma.item.create({
      data: {
        assetTag: `TAG-LOAN-${Date.now()}`,
        name: "Loan Test Item",
        status: ItemStatus.ON_LOAN,
        managedBy: testCustodian.id,
      },
    });

    const req1 = await prisma.loanRequest.create({
      data: {
        itemId: testItem.id,
        borrowerId: testBorrower1.id,
        status: RequestStatus.FULFILLED,
        fulfilledAt: new Date(),
      },
    });

    const req2 = await prisma.loanRequest.create({
      data: {
        itemId: testItem.id,
        borrowerId: testBorrower2.id,
        status: RequestStatus.FULFILLED,
        fulfilledAt: new Date(),
      },
    });

    await prisma.loan.create({
      data: {
        itemId: testItem.id,
        borrowerId: testBorrower1.id,
        requestId: req1.id,
        custodianId: testCustodian.id,
        status: LoanStatus.ACTIVE,
      },
    });

    let duplicateLoanRejected = false;
    try {
      await prisma.loan.create({
        data: {
          itemId: testItem.id,
          borrowerId: testBorrower2.id,
          requestId: req2.id,
          custodianId: testCustodian.id,
          status: LoanStatus.ACTIVE,
        },
      });
    } catch (e: any) {
      duplicateLoanRejected = true;
      expect(e.code === "P2002" || e.message?.includes("unique") || e.message?.includes("idx_loans_active_item_unique")).toBe(true);
    }

    expect(duplicateLoanRejected).toBe(true);
  });

  it("TEST-65: rejects two loans referencing the same request_id via UNIQUE constraint", async () => {
    const testCustodian = await prisma.user.create({
      data: {
        username: `${PREFIX}cust_req_${Date.now()}`,
        passwordHash: "$argon2id$dummy",
        displayName: "Custodian Req",
        role: Role.CUSTODIAN,
      },
    });

    const testBorrower = await prisma.user.create({
      data: {
        username: `${PREFIX}borr_req_${Date.now()}`,
        passwordHash: "$argon2id$dummy",
        displayName: "Borrower Req",
        role: Role.BORROWER,
      },
    });

    const testItem1 = await prisma.item.create({
      data: {
        assetTag: `TAG-REQ-1-${Date.now()}`,
        name: "Item 1",
        status: ItemStatus.AVAILABLE,
        managedBy: testCustodian.id,
      },
    });

    const testItem2 = await prisma.item.create({
      data: {
        assetTag: `TAG-REQ-2-${Date.now()}`,
        name: "Item 2",
        status: ItemStatus.AVAILABLE,
        managedBy: testCustodian.id,
      },
    });

    const req = await prisma.loanRequest.create({
      data: {
        itemId: testItem1.id,
        borrowerId: testBorrower.id,
        status: RequestStatus.FULFILLED,
        fulfilledAt: new Date(),
      },
    });

    await prisma.loan.create({
      data: {
        itemId: testItem1.id,
        borrowerId: testBorrower.id,
        requestId: req.id,
        custodianId: testCustodian.id,
        status: LoanStatus.ACTIVE,
      },
    });

    let duplicateRequestRejected = false;
    try {
      await prisma.loan.create({
        data: {
          itemId: testItem2.id,
          borrowerId: testBorrower.id,
          requestId: req.id,
          custodianId: testCustodian.id,
          status: LoanStatus.ACTIVE,
        },
      });
    } catch (e: any) {
      duplicateRequestRejected = true;
      expect(e.code === "P2002" || e.message?.includes("unique") || e.message?.includes("loans_request_id_key")).toBe(true);
    }

    expect(duplicateRequestRejected).toBe(true);
  });
});
