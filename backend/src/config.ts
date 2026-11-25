import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Load local or root .env file
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

export function createEnvSchema(env: Record<string, string | undefined> = process.env) {
  const isTest = env.NODE_ENV === "test";
  const isProd = env.NODE_ENV === "production";

  return z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: isTest
      ? z.string().url().default("postgresql://postgres:postgres@localhost:5432/inventory_test?schema=public")
      : z.string().url(),
    JWT_SECRET: isTest
      ? z.string().min(32).default("test-secret-at-least-32-chars-long-for-testing-only")
      : z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
    JWT_EXPIRES_IN_MINUTES: z.coerce.number().default(60),
    SEED_DEMO_PASSWORD: z.string().optional(),
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
    VITE_API_URL: z.string().default("http://localhost:3000"),
    CLIENT_DIST_PATH: z.string().optional(),
  });
}

export function validateConfigSchema(env: Record<string, string | undefined> = process.env) {
  return createEnvSchema(env).parse(env);
}

export const envSchema = createEnvSchema(process.env);
export const config = envSchema.parse(process.env);
