import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

// E2E must never run against inventory_dev.
const envTestPath = fs.existsSync(path.resolve(process.cwd(), ".env.test"))
  ? path.resolve(process.cwd(), ".env.test")
  : path.resolve(process.cwd(), "../.env.test");

process.loadEnvFile(envTestPath);
if (!(process.env.DATABASE_URL ?? "").includes("inventory_test")) {
  throw new Error("E2E refused: DATABASE_URL must point to inventory_test.");
}

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: `${npmCmd} run dev:e2e --workspace=backend`,
      url: "http://localhost:3000/health",
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: `${npmCmd} run dev --workspace=frontend`,
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
