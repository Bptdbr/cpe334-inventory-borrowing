import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Load local or root .env file
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const isTest = process.env.NODE_ENV === "test";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: isTest
    ? z.string().url().default("postgresql://postgres:postgres@localhost:5432/inventory_test?schema=public")
    : z.string().url(),
  JWT_SECRET: isTest
    ? z.string().min(32).default("test-secret-at-least-32-chars-long-for-testing-only")
    : z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  JWT_EXPIRES_IN_MINUTES: z.coerce.number().default(60),
  SEED_DEMO_PASSWORD: z.string().default("demo_password_123"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  VITE_API_URL: z.string().default("http://localhost:3000"),
});

export const config = envSchema.parse(process.env);
