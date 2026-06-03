import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const configDir = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(configDir, "../../.env") });
dotenv.config({ path: path.resolve(configDir, "../../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NETWORK_FILE_STORAGE: z.string().trim().min(1, "NETWORK_FILE_STORAGE is required"),
  REPOSITORY_UPLOAD_MAX_FILES: z.coerce.number().int().positive().default(2000),
  REPOSITORY_UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(25)
});

export const env = envSchema.parse(process.env);
