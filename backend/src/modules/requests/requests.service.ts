import { ItemStatus, RequestStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError, notFound } from "../../lib/errors.js";

export async function createRequest(itemId: string, borrowerId: string) {
  // 1. Check item exists
  const item = await prisma.item.findUnique({
    where: { id: itemId },
  });

  if (!item) {
    throw notFound();
  }

  // 2. Check item availability (BR-02)
  if (item.status !== ItemStatus.AVAILABLE) {
    throw new AppError(409, "ITEM_UNAVAILABLE", "This item is not available.");
  }

  // 3. Check for existing PENDING request by this borrower for this item (BR-06)
  const existingPending = await prisma.loanRequest.findFirst({
    where: {
      itemId,
      borrowerId,
      status: RequestStatus.PENDING,
    },
  });

  if (existingPending) {
    throw new AppError(409, "DUPLICATE_PENDING_REQUEST", "You already have a pending request for this item.");
  }

  // 4. Insert new PENDING request
  try {
    return await prisma.loanRequest.create({
      data: {
        itemId,
        borrowerId,
        status: RequestStatus.PENDING,
      },
      select: {
        id: true,
        itemId: true,
        borrowerId: true,
        status: true,
        createdAt: true,
        fulfilledAt: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "DUPLICATE_PENDING_REQUEST", "You already have a pending request for this item.");
    }
    throw error;
  }
}

export async function listMyRequests(borrowerId: string) {
  // Filter strictly by borrower_id (BR-04)
  return prisma.loanRequest.findMany({
    where: { borrowerId },
    select: {
      id: true,
      itemId: true,
      status: true,
      createdAt: true,
      fulfilledAt: true,
      item: {
        select: {
          id: true,
          assetTag: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
