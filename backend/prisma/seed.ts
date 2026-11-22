import { PrismaClient, Role, ItemStatus, RequestStatus, LoanStatus } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

export async function seed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed database in production environment.");
  }

  const seedPassword = process.env.SEED_DEMO_PASSWORD;
  if (!seedPassword) {
    throw new Error("SEED_DEMO_PASSWORD environment variable is required to run seed.");
  }

  const passwordHash = await argon2.hash(seedPassword, { type: argon2.argon2id });

  console.log("Seeding users...");

  // 1. Seed demo users (2 borrowers, 2 custodians) - Idempotent upserts
  const borrower1 = await prisma.user.upsert({
    where: { username: "borrower1" },
    update: { passwordHash, displayName: "Alice Borrower", role: Role.BORROWER },
    create: {
      username: "borrower1",
      passwordHash,
      displayName: "Alice Borrower",
      role: Role.BORROWER,
    },
  });

  const borrower2 = await prisma.user.upsert({
    where: { username: "borrower2" },
    update: { passwordHash, displayName: "Bob Borrower", role: Role.BORROWER },
    create: {
      username: "borrower2",
      passwordHash,
      displayName: "Bob Borrower",
      role: Role.BORROWER,
    },
  });

  const custodian1 = await prisma.user.upsert({
    where: { username: "custodian1" },
    update: { passwordHash, displayName: "Charlie Custodian", role: Role.CUSTODIAN },
    create: {
      username: "custodian1",
      passwordHash,
      displayName: "Charlie Custodian",
      role: Role.CUSTODIAN,
    },
  });

  const custodian2 = await prisma.user.upsert({
    where: { username: "custodian2" },
    update: { passwordHash, displayName: "Diana Custodian", role: Role.CUSTODIAN },
    create: {
      username: "custodian2",
      passwordHash,
      displayName: "Diana Custodian",
      role: Role.CUSTODIAN,
    },
  });

  console.log("Seeding items...");

  // 2. Seed 8 equipment items (4 managed by custodian1, 4 managed by custodian2)
  const itemsData = [
    {
      assetTag: "EQ-001",
      name: "Digital Oscilloscope 100MHz",
      description: "2-channel digital storage oscilloscope",
      managedBy: custodian1.id,
    },
    {
      assetTag: "EQ-002",
      name: "Digital Multimeter",
      description: "True RMS auto-ranging multimeter",
      managedBy: custodian1.id,
    },
    {
      assetTag: "EQ-003",
      name: "Soldering Station 60W",
      description: "Temperature controlled ESD safe",
      managedBy: custodian1.id,
    },
    {
      assetTag: "EQ-004",
      name: "DC Power Supply 30V/5A",
      description: "Linear adjustable power supply",
      managedBy: custodian1.id,
    },
    {
      assetTag: "EQ-005",
      name: "Function Generator 25MHz",
      description: "Dual-channel arbitrary waveform generator",
      managedBy: custodian2.id,
    },
    {
      assetTag: "EQ-006",
      name: "Logic Analyzer 16CH",
      description: "USB 100MHz logic analyzer",
      managedBy: custodian2.id,
    },
    {
      assetTag: "EQ-007",
      name: "Spectrum Analyzer 1.5GHz",
      description: "RF spectrum analyzer with tracking generator",
      managedBy: custodian2.id,
    },
    {
      assetTag: "EQ-008",
      name: "Microcontroller Dev Kit",
      description: "STM32 Nucleo-64 ARM Cortex-M4 development board",
      managedBy: custodian2.id,
    },
  ];

  const seededItems: Record<string, { id: string; assetTag: string }> = {};

  for (const itemData of itemsData) {
    const item = await prisma.item.upsert({
      where: { assetTag: itemData.assetTag },
      update: {
        name: itemData.name,
        description: itemData.description,
        managedBy: itemData.managedBy,
      },
      create: {
        assetTag: itemData.assetTag,
        name: itemData.name,
        description: itemData.description,
        status: ItemStatus.AVAILABLE,
        managedBy: itemData.managedBy,
      },
    });
    seededItems[item.assetTag] = item;
  }

  console.log("Seeding initial active loan on EQ-001...");

  // 3. Seed 1 initial active loan on EQ-001 (idempotent: check if active loan already exists)
  const itemOnLoan = seededItems["EQ-001"];
  const existingActiveLoan = await prisma.loan.findFirst({
    where: {
      itemId: itemOnLoan.id,
      status: LoanStatus.ACTIVE,
    },
  });

  if (!existingActiveLoan) {
    // Mark item as ON_LOAN
    await prisma.item.update({
      where: { id: itemOnLoan.id },
      data: { status: ItemStatus.ON_LOAN },
    });

    // Create fulfilled request
    const request = await prisma.loanRequest.create({
      data: {
        itemId: itemOnLoan.id,
        borrowerId: borrower1.id,
        status: RequestStatus.FULFILLED,
        fulfilledAt: new Date(),
      },
    });

    // Create active loan
    await prisma.loan.create({
      data: {
        itemId: itemOnLoan.id,
        borrowerId: borrower1.id,
        requestId: request.id,
        custodianId: custodian1.id,
        status: LoanStatus.ACTIVE,
      },
    });
    console.log("Initial active loan created on EQ-001.");
  } else {
    console.log("Active loan on EQ-001 already exists, skipping.");
  }

  console.log("Database seed completed successfully.");
}

// Execute standalone if called directly via CLI
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  seed()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error("Seed failed:", e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
