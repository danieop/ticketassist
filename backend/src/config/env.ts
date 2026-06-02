import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: ".env" });
dotenv.config({ path: "../.env" });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required")
});

export const env = envSchema.parse(process.env);
