import { describe, it, expect } from "vitest";
import { validateConfigSchema } from "../../src/config.js";
import { seed } from "../../prisma/seed.js";
import { afterEach } from "vitest";

const originalEnv = { ...process.env };
afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Production security configuration and seed validation (L5-2, AC-L5-06, AC-L5-07)", () => {
  it("TEST-L5-06: config is valid in production without SEED_DEMO_PASSWORD (only the seed needs it)", () => {
    const prodEnvWithoutSeedPassword = {
      NODE_ENV: "production",
      PORT: "3000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/inventory_prod?schema=public",
      JWT_SECRET: "a-secret-that-is-at-least-32-characters-long-prod",
    };

    expect(() => validateConfigSchema(prodEnvWithoutSeedPassword)).not.toThrow();
  });

  it("TEST-L5-07: seed function rejects default 'demo_password_123' in production environment", async () => {
    process.env.NODE_ENV = "production";
    process.env.SEED_DEMO_PASSWORD = "demo_password_123";

    await expect(seed()).rejects.toThrowError(
      /Refusing to seed database in production with the default demo password/
    );
  });
});

