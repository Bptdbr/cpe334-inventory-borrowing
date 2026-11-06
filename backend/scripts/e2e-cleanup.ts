import { prisma } from "../src/lib/prisma.js";

// Safety guard: only ever touch the test database.
if (!(process.env.DATABASE_URL ?? "").includes("inventory_test")) {
  console.error("Refusing to run: DATABASE_URL must point to inventory_test.");
  process.exit(1);
}

async function main() {
  const where = { item: { assetTag: { startsWith: "E2E-" } } };
  const loans = await prisma.loan.deleteMany({ where });
  const requests = await prisma.loanRequest.deleteMany({ where });
  const items = await prisma.item.deleteMany({ where: { assetTag: { startsWith: "E2E-" } } });
  console.log(`Removed ${loans.count} loans, ${requests.count} requests, ${items.count} items (E2E-*).`);
}

main().finally(() => prisma.$disconnect());