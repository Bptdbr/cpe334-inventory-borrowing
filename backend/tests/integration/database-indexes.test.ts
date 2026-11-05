import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, Role, ItemStatus, RequestStatus, LoanStatus } from "@prisma/client";

const prisma = new PrismaClient();
let isDatabaseConnected = false;

describe("Database Constraints and Partial Indexes (TEST-50, TEST-64, TEST-65)", () => {
  beforeAll(async () => {
    try {
      await prisma.$connect();
      isDatabaseConnected = true;
    } catch (e: any) {
      isDatabaseConnected = false;
      console.warn(
        "Notice: PostgreSQL connection not established with default test credentials. " +
        "Ensure your local DATABASE_URL in .env has valid credentials to run live DB assertions."
      );
    }
  });

  afterAll(async () => {
    if (isDatabaseConnected) {
      await prisma.$disconnect();
    }
  });

  it("TEST-50: rejects duplicate PENDING request for same borrower and item via partial index", async ({ skip }) => {
    if (!isDatabaseConnected) {
      skip();
      return;
    }

    const testUser = await prisma.user.create({
      data: {
        username: `test_borrower_${Date.now()}`,
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$dummyhashforunittesting",
        displayName: "Test Borrower",
        role: Role.BORROWER,
      },
    });

    const testCustodian = await prisma.user.create({
      data: {
        username: `test_custodian_${Date.now()}`,
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

  it("TEST-64: rejects duplicate ACTIVE loan for same item via partial index", async ({ skip }) => {
    if (!isDatabaseConnected) {
      skip();
      return;
    }

    const testCustodian = await prisma.user.create({
      data: {
        username: `test_cust_loan_${Date.now()}`,
        passwordHash: "$argon2id$dummy",
        displayName: "Custodian Loan",
        role: Role.CUSTODIAN,
      },
    });

    const testBorrower1 = await prisma.user.create({
      data: {
        username: `test_borr1_${Date.now()}`,
        passwordHash: "$argon2id$dummy",
        displayName: "Borrower 1",
        role: Role.BORROWER,
      },
    });

    const testBorrower2 = await prisma.user.create({
      data: {
        username: `test_borr2_${Date.now()}`,
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

  it("TEST-65: rejects two loans referencing the same request_id via UNIQUE constraint", async ({ skip }) => {
    if (!isDatabaseConnected) {
      skip();
      return;
    }

    const testCustodian = await prisma.user.create({
      data: {
        username: `test_cust_req_${Date.now()}`,
        passwordHash: "$argon2id$dummy",
        displayName: "Custodian Req",
        role: Role.CUSTODIAN,
      },
    });

    const testBorrower = await prisma.user.create({
      data: {
        username: `test_borr_req_${Date.now()}`,
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
