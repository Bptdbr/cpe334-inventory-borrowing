import { ItemStatus, LoanStatus, Prisma, RequestStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";

export const requestNotFound = () => new AppError(404, "NOT_FOUND", "Request not found");
export const requestNotPending = () =>
  new AppError(409, "REQUEST_NOT_PENDING", "This request is not pending");
export const itemUnavailable = () => new AppError(409, "ITEM_UNAVAILABLE", "This item is not available");
export const activeLoanExists = () =>
  new AppError(409, "ACTIVE_LOAN_EXISTS", "An active loan already exists for this item");

// Atomic checkout (SDS 6.1). Every failure throws, which rolls the transaction back.
export async function checkoutRequest(requestId: string, custodianId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Scope: the request must concern an item managed by the caller (BR-03, D-07).
      const request = await tx.loanRequest.findFirst({
        where: { id: requestId, item: { managedBy: custodianId } },
      });
      if (!request) throw requestNotFound();

      // Conditional updates: the status change itself is the check (BR-07, BR-02).
      const fulfilled = await tx.loanRequest.updateMany({
        where: { id: requestId, status: RequestStatus.PENDING },
        data: { status: RequestStatus.FULFILLED, fulfilledAt: new Date() },
      });
      if (fulfilled.count === 0) throw requestNotPending();

      const onLoan = await tx.item.updateMany({
        where: { id: request.itemId, status: ItemStatus.AVAILABLE },
        data: { status: ItemStatus.ON_LOAN },
      });
      if (onLoan.count === 0) throw itemUnavailable();

      // item and borrower are copied from the request, never from the client.
      return tx.loan.create({
        data: {
          itemId: request.itemId,
          borrowerId: request.borrowerId,
          requestId: request.id,
          custodianId,
          status: LoanStatus.ACTIVE,
        },
        select: {
          id: true,
          itemId: true,
          borrowerId: true,
          requestId: true,
          custodianId: true,
          status: true,
          checkedOutAt: true,
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw activeLoanExists();
    }
    throw error;
  }
}