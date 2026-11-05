import dotenv from "dotenv";
import path from "path";

// Must run before any module that reads process.env (config.ts, prisma).
// dotenv never overrides variables that are already set, so this file goes first.
dotenv.config({ path: path.resolve(__dirname, "../../.env.test") });

if (!process.env.DATABASE_URL?.includes("inventory_test")) {
  throw new Error("Refusing to run tests: DATABASE_URL must point to inventory_test.");
}