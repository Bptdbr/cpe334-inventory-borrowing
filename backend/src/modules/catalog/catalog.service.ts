import { ItemStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { CreateItemInput } from "./catalog.schema.js";

export async function listItems() {
  return prisma.item.findMany({
    select: {
      id: true,
      assetTag: true,
      name: true,
      description: true,
      status: true,
      managedBy: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createItem(input: CreateItemInput, custodianId: string) {
  try {
    return await prisma.item.create({
      data: {
        assetTag: input.assetTag,
        name: input.name,
        description: input.description ?? "",
        status: ItemStatus.AVAILABLE,
        managedBy: custodianId,
      },
      select: {
        id: true,
        assetTag: true,
        name: true,
        description: true,
        status: true,
        managedBy: true,
        createdAt: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "DUPLICATE_ASSET_TAG", "An item with this asset tag already exists.");
    }
    throw error;
  }
}
