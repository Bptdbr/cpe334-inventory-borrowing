import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

// E2E must never run against inventory_dev.
process.loadEnvFile(path.resolve(process.cwd(), "../.env.test"));
if (!(process.env.DATABASE_URL ?? "").includes("inventory_test")) {
  throw new Error("E2E refused: DATABASE_URL must point to inventory_test.");
}

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
      command: "npm.cmd run dev:e2e --workspace=backend",
      url: "http://localhost:3000/health",
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: "npm.cmd run dev --workspace=frontend",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
