import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CORS_ORIGIN: z.string().default("*"),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters"),
  ADMIN_TOKEN_SECRET: z.string().min(16).optional(),
  ADMIN_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(120)
});

const parsedEnv = envSchema.parse(process.env);

export const config = {
  nodeEnv: parsedEnv.NODE_ENV,
  port: parsedEnv.PORT,
  databaseUrl: parsedEnv.DATABASE_URL,
  corsOrigin: parsedEnv.CORS_ORIGIN,
  adminPassword: parsedEnv.ADMIN_PASSWORD,
  adminTokenSecret: parsedEnv.ADMIN_TOKEN_SECRET ?? parsedEnv.ADMIN_PASSWORD,
  adminTokenTtlMinutes: parsedEnv.ADMIN_TOKEN_TTL_MINUTES
};
