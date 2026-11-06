import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const tx = {
  loanRequest: { findFirst: vi.fn(), updateMany: vi.fn() },
  item: { updateMany: vi.fn() },
  loan: { create: vi.fn() },
};

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)) },
}));

import { checkoutRequest } from "../../src/modules/loans/loans.service.js";

const REQ = { id: "r1", itemId: "i1", borrowerId: "b1" };

beforeEach(() => {
  vi.clearAllMocks();
  tx.loanRequest.findFirst.mockResolvedValue(REQ);
  tx.loanRequest.updateMany.mockResolvedValue({ count: 1 });
  tx.item.updateMany.mockResolvedValue({ count: 1 });
  tx.loan.create.mockResolvedValue({ id: "l1" });
});

describe("checkoutRequest transaction errors (F-05, AC-37)", () => {
  it("TEST-70: item update affecting 0 rows throws ITEM_UNAVAILABLE (409) and creates no loan", async () => {
    tx.item.updateMany.mockResolvedValue({ count: 0 });

    await expect(checkoutRequest("r1", "c1")).rejects.toMatchObject({ status: 409, code: "ITEM_UNAVAILABLE" });
    expect(tx.loan.create).not.toHaveBeenCalled();
  });

  it("TEST-71: request update affecting 0 rows throws REQUEST_NOT_PENDING (409), item untouched", async () => {
    tx.loanRequest.updateMany.mockResolvedValue({ count: 0 });

    await expect(checkoutRequest("r1", "c1")).rejects.toMatchObject({ status: 409, code: "REQUEST_NOT_PENDING" });
    expect(tx.item.updateMany).not.toHaveBeenCalled();
    expect(tx.loan.create).not.toHaveBeenCalled();
  });

  it("TEST-72: a P2002 unique violation on loan insertion throws ACTIVE_LOAN_EXISTS (409)", async () => {
    tx.loan.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    await expect(checkoutRequest("r1", "c1")).rejects.toMatchObject({ status: 409, code: "ACTIVE_LOAN_EXISTS" });
  });
});