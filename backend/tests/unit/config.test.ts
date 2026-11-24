import { describe, it, expect } from "vitest";
import { validateConfigSchema } from "../../src/config.js";
import { seed } from "../../prisma/seed.js";

describe("Production security configuration and seed validation (L5-2, AC-L5-06, AC-L5-07)", () => {
  it("TEST-L5-06: rejects missing or empty SEED_DEMO_PASSWORD when NODE_ENV is production", () => {
    const prodEnvWithoutSeedPassword = {
      NODE_ENV: "production",
      PORT: "3000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/inventory_prod?schema=public",
      JWT_SECRET: "a-secret-that-is-at-least-32-characters-long-prod",
    };

    expect(() => validateConfigSchema(prodEnvWithoutSeedPassword)).toThrowError(
      /SEED_DEMO_PASSWORD/
    );
  });

  it("TEST-L5-07: seed function rejects default 'demo_password_123' in production environment", async () => {
    process.env.NODE_ENV = "production";
    process.env.SEED_DEMO_PASSWORD = "demo_password_123";

    await expect(seed()).rejects.toThrowError(
      /Refusing to seed database in production with the default demo password/
    );
  });
});
