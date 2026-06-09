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
  STORAGE_DRIVER: z.enum(["local", "sftp"]).default("local"),
  NETWORK_FILE_STORAGE: z.string().trim().min(1, "NETWORK_FILE_STORAGE is required"),
  SFTP_HOST: z.string().trim().optional(),
  SFTP_PORT: z.coerce.number().int().positive().default(22),
  SFTP_USERNAME: z.string().trim().optional(),
  SFTP_PASSWORD: z.string().optional(),
  REPOSITORY_UPLOAD_MAX_FILES: z.coerce.number().int().positive().default(2000),
  REPOSITORY_UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(25),
  DEFAULT_CODEBASE_PATH: z
    .string()
    .trim()
    .min(1)
    .default(path.resolve(configDir, "../../codebasetest/CardSeller-main/CardSeller")),
  CLIENT_ORIGIN: z.string().trim().min(1).default("http://localhost:3000"),
  JWT_SECRET: z.string().trim().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().trim().min(1).default("7d"),
  JWT_ACCESS_EXPIRES_IN: z.string().trim().min(1).default("3d"),
  JWT_REFRESH_EXPIRES_IN: z.string().trim().min(1).default("30d"),
  GOOGLE_CLIENT_ID: z.string().trim().optional(),
  AI_BASE_URL: z.string().trim().default("https://api.openai.com/v1"),
  AI_EXTRA_HEADERS: z.string().trim().default("{}"),
  OPENAI_API_KEY: z.string().optional(),
  AI_MODEL_ANALYZER: z.string().trim().default("gpt-4.1-mini"),
  AI_MODEL_PRIORITY: z.string().trim().default("gpt-4.1-mini"),
  AI_MODEL_CODE_CONTEXT: z.string().trim().default("gpt-4.1-mini"),
  AI_MODEL_FIX_PROPOSAL: z.string().trim().default("gpt-4.1-mini"),
  AI_MODEL_MENTOR_DRAFT: z.string().trim().default("gpt-4.1-mini"),
  EMBEDDING_MODEL: z.string().trim().default("text-embedding-3-small"),
  REPO_INDEX_NAME: z.string().trim().default("default-repo-index"),
  PGVECTOR_CODE_CHUNKS_TABLE: z.string().trim().default("code_chunks")
}).superRefine((value, context) => {
  if (value.STORAGE_DRIVER !== "sftp") {
    return;
  }

  for (const key of ["SFTP_HOST", "SFTP_USERNAME", "SFTP_PASSWORD"] as const) {
    if (!value[key]) {
      context.addIssue({
        code: "custom",
        path: [key],
        message: `${key} is required when STORAGE_DRIVER=sftp`
      });
    }
  }
});

export const env = envSchema.parse(process.env);
