import { z } from "zod";

const ticketSourceSchema = z.enum(["EMAIL", "SLACK", "ZENDESK", "JIRA", "MANUAL"]);

export const listTicketsSchema = z.object({
  source: ticketSourceSchema.optional(),
  reporterId: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(120).optional()
});

export const createTicketSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(5000),
  reporterName: z.string().trim().min(2).max(120).default("Unknown reporter"),
  source: ticketSourceSchema.default("MANUAL"),
  reporterId: z.string().trim().min(1).optional()
});

export const updateTicketSchema = createTicketSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  "At least one field is required"
);

export type ListTicketsInput = z.infer<typeof listTicketsSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
