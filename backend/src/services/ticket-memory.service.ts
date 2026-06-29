import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { createEmbeddingClient, toPgVectorLiteral } from "./embedding.service.js";

const tableName = env.PGVECTOR_TICKET_MEMORY_TABLE;

export const ticketMemoryService = {
  async ensureTicketMemoryTable() {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        workflow_run_id TEXT NOT NULL UNIQUE,
        ticket_id TEXT NOT NULL,
        repository_id TEXT,
        title TEXT NOT NULL,
        description_summary TEXT NOT NULL,
        affected_feature TEXT,
        fix_title TEXT,
        fix_approach TEXT,
        priority_level TEXT,
        mentor_decision TEXT,
        resolved_files TEXT[] NOT NULL DEFAULT '{}',
        status TEXT NOT NULL,
        embedding vector,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS ${tableName}_repository_idx
      ON ${tableName} (repository_id)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS ${tableName}_status_idx
      ON ${tableName} (status)
    `);
  },

  async embedAndStoreWorkflow(workflowRunId: string) {
    const workflow = await prisma.workflowRun.findUnique({
      where: { id: workflowRunId },
      include: { ticket: true, state: true, mentorReview: true }
    });

    if (!workflow || !workflow.state) {
      return;
    }

    const state = workflow.state as any;
    const ticketAnalysis = state.ticketAnalysis;
    const fixProposal = state.fixProposal;
    const priority = state.priorityClassification;
    
    const summary = ticketAnalysis?.summary ?? "";
    const feature = ticketAnalysis?.affectedFeature ?? "";
    const fixTitle = fixProposal?.title ?? "";
    const fixApproach = fixProposal?.recommendedApproach ?? "";
    const priorityLevel = priority?.level ?? "";

    const textToEmbed = [
      workflow.ticket.title,
      summary,
      feature ? `Feature: ${feature}` : "",
      fixTitle ? `Fix: ${fixTitle}` : "",
      fixApproach
    ].filter(Boolean).join(". ");

    const embeddingClient = createEmbeddingClient();
    const embedding = await embeddingClient.embedQuery(textToEmbed);

    const resolvedFiles = fixProposal?.patchProposal?.targetFiles ?? [];

    await prisma.$executeRawUnsafe(`
      INSERT INTO ${tableName} (
        id, workflow_run_id, ticket_id, repository_id, title, description_summary,
        affected_feature, fix_title, fix_approach, priority_level, mentor_decision,
        resolved_files, status, embedding, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::vector, now()
      )
      ON CONFLICT (workflow_run_id) DO UPDATE SET
        title = $5,
        description_summary = $6,
        affected_feature = $7,
        fix_title = $8,
        fix_approach = $9,
        priority_level = $10,
        mentor_decision = $11,
        resolved_files = $12,
        status = $13,
        embedding = $14::vector,
        updated_at = now()
    `,
      `mem_${workflow.id}`,
      workflow.id,
      workflow.ticketId,
      workflow.repositoryId ?? null,
      workflow.ticket.title,
      summary,
      feature || null,
      fixTitle || null,
      fixApproach || null,
      priorityLevel || null,
      workflow.mentorReview?.decision ?? null,
      resolvedFiles,
      workflow.status,
      toPgVectorLiteral(embedding)
    );
  },

  async findSimilarTickets(query: string, repositoryId?: string | null, limit: number = env.TICKET_MEMORY_MAX_RESULTS) {
    if (!query.trim()) return [];

    const embeddingClient = createEmbeddingClient();
    const embedding = await embeddingClient.embedQuery(query);
    const vectorLiteral = toPgVectorLiteral(embedding);

    const minScore = env.TICKET_MEMORY_MIN_SCORE;

    let rows;
    if (repositoryId) {
        rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT workflow_run_id, ticket_id, title, description_summary, affected_feature, 
                   fix_title, fix_approach, priority_level, mentor_decision, resolved_files, status,
                   (1 - (embedding <=> $1::vector))::float AS score
            FROM ${tableName}
            WHERE repository_id = $2 AND embedding IS NOT NULL
            ORDER BY embedding <=> $1::vector
            LIMIT $3
        `, vectorLiteral, repositoryId, limit);
    } else {
        rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT workflow_run_id, ticket_id, title, description_summary, affected_feature, 
                   fix_title, fix_approach, priority_level, mentor_decision, resolved_files, status,
                   (1 - (embedding <=> $1::vector))::float AS score
            FROM ${tableName}
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> $1::vector
            LIMIT $2
        `, vectorLiteral, limit);
    }

    return rows
        .filter(row => row.score >= minScore)
        .map(row => ({
            workflowRunId: row.workflow_run_id,
            ticketId: row.ticket_id,
            title: row.title,
            score: Number(row.score.toFixed(4)),
            matchType: "vector" as const,
            status: row.status,
            matchedSignals: [],
            summary: row.description_summary,
            fixTitle: row.fix_title,
            fixApproach: row.fix_approach,
            resolvedFiles: row.resolved_files,
            reviewedDecision: row.mentor_decision,
            priorityLevel: row.priority_level,
            affectedFeature: row.affected_feature
        }));
  },

  async getMemoryStats(repositoryId?: string | null) {
      if (repositoryId) {
          const res = await prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*) as count FROM ${tableName} WHERE repository_id = $1`, repositoryId);
          return Number(res[0]?.count ?? 0);
      } else {
          const res = await prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*) as count FROM ${tableName}`);
          return Number(res[0]?.count ?? 0);
      }
  }
};
