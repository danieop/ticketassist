import { z } from "zod";

export const uploadRepositorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  uploadedById: z.string().trim().min(1).optional()
});

export type UploadRepositoryInput = z.infer<typeof uploadRepositorySchema>;
