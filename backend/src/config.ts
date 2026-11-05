import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url().default("postgresql://postgres:postgres@localhost:5432/inventory_dev?schema=public"),
  JWT_SECRET: z.string().min(32).default("supersecretjwtkeythatisatleast32charslong12345"),
  JWT_EXPIRES_IN_MINUTES: z.coerce.number().default(60),
  SEED_DEMO_PASSWORD: z.string().default("demo_password_123"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  VITE_API_URL: z.string().default("http://localhost:3000"),
});

export const config = envSchema.parse(process.env);

