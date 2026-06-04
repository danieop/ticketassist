import { z } from "zod";

export const createWorkflowSchema = z.object({
  repositoryId: z.string().trim().min(1).optional(),
  retrievalStrategy: z.enum(["keyword", "vector", "hybrid"]).default("hybrid"),
  indexName: z.string().trim().min(1).optional(),
  forceReindex: z.coerce.boolean().default(false),
  maxResults: z.coerce.number().int().positive().max(50).default(10),
  ticket: z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().default(""),
    reporterName: z.string().trim().min(2).default("Unknown reporter"),
    source: z.enum(["EMAIL", "SLACK", "ZENDESK", "JIRA", "MANUAL"]).default("MANUAL"),
    reporterId: z.string().optional()
  })
});

export const reviewWorkflowSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "NEED_MORE_INFORMATION"]),
  comment: z.string().trim().min(3),
  mentorId: z.string().optional()
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type ReviewWorkflowInput = z.infer<typeof reviewWorkflowSchema>;
