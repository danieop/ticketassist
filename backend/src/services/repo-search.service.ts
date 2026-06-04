import { createHash } from "node:crypto";
import path from "node:path";
import type { CodeRepository, CodeRepositoryFile } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../middlewares/error-handler.js";
import { createEmbeddingClient, toPgVectorLiteral } from "./embedding.service.js";
import { repositoryService } from "./repository.service.js";
import type {
  PriorityClassification,
  RepoSearchResult,
  RetrievalStrategy,
  TicketAnalysis
} from "./workflow-state.js";

const allowedExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".java",
  ".jsp",
  ".go",
  ".rb",
  ".php",
  ".cs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".css",
  ".scss",
  ".html",
  ".sql",
  ".xml",
  ".properties"
]);

const skippedPathParts = new Set([
  ".git",
  ".gradle",
  ".idea",
  ".next",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "temp",
  "tmp"
]);

const skippedFileNames = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock"
]);

const stopWords = new Set([
  "after",
  "all",
  "and",
  "are",
  "but",
  "can",
  "cannot",
  "click",
  "clicks",
  "code",
  "created",
  "does",
  "entering",
  "for",
  "forever",
  "from",
  "has",
  "have",
  "happens",
  "issue",
  "page",
  "place",
  "not",
  "shows",
  "submit",
  "the",
  "this",
  "user",
  "users",
  "when",
  "work",
  "with"
]);

type RepositoryWithFiles = CodeRepository & {
  files: CodeRepositoryFile[];
};

type CodeChunk = {
  filePath: string;
  language: string;
  startLine: number;
  endLine: number;
  content: string;
  contentHash: string;
  symbols: string[];
  metadata: Record<string, unknown>;
};

export type RepoIndexStatus = {
  indexName: string;
  exists: boolean;
  builtOrUpdated: boolean;
  indexedFiles?: number;
  indexedChunks?: number;
  embeddingModel?: string;
  vectorStore: "postgresql_pgvector";
};

export type RepoSearchInput = {
  repositoryId: string;
  indexName: string;
  queryTerms: string[];
  semanticQuery: string;
  strategy: RetrievalStrategy;
  maxResults: number;
  forceReindex?: boolean;
};

function getCodeChunksTable() {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(env.PGVECTOR_CODE_CHUNKS_TABLE)) {
    throw new AppError(500, "Invalid PGVECTOR_CODE_CHUNKS_TABLE value");
  }

  return `"${env.PGVECTOR_CODE_CHUNKS_TABLE}"`;
}

function toNumber(value: unknown) {
  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "number") {
    return value;
  }

  return Number(value ?? 0);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizePathParts(filePath: string) {
  return filePath.replace(/\\/g, "/").split("/").filter(Boolean);
}

function isSearchableFile(file: CodeRepositoryFile) {
  const relativePath = file.relativePath.replace(/\\/g, "/");
  const parts = normalizePathParts(relativePath);
  const fileName = parts.at(-1)?.toLowerCase() ?? "";
  const extension = path.extname(fileName).toLowerCase();
  const sizeBytes = typeof file.sizeBytes === "bigint" ? Number(file.sizeBytes) : Number(file.sizeBytes);

  return (
    allowedExtensions.has(extension) &&
    !skippedFileNames.has(fileName) &&
    sizeBytes <= 500 * 1024 &&
    !parts.some((part) => skippedPathParts.has(part.toLowerCase())) &&
    !/\.min\.(js|css)$/i.test(fileName)
  );
}

function getLanguage(filePath: string) {
  return path.extname(filePath).replace(".", "").toLowerCase() || "text";
}

function hashContent(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

function extractSymbols(content: string) {
  const symbols = new Set<string>();
  const patterns = [
    /\b(?:function|class|interface|enum)\s+([A-Za-z_$][\w$]*)/g,
    /\bexport\s+(?:default\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g,
    /\b(?:public|private|protected)?\s*(?:static\s+)?(?:void|String|int|double|boolean|BigDecimal|List<[^>]+>)\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /\b(?:FROM|JOIN|UPDATE|INTO)\s+([A-Za-z_][\w.]*)/gi,
    /<servlet-name>\s*([^<]+)\s*<\/servlet-name>/gi
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      if (match[1]) {
        symbols.add(match[1].trim());
      }
    }
  }

  return [...symbols].slice(0, 20);
}

function chunkFile(filePath: string, content: string): CodeChunk[] {
  const lines = content.split(/\r?\n/);
  const chunks: CodeChunk[] = [];
  const maxLines = 120;
  const overlap = 15;

  for (let index = 0; index < lines.length; index += maxLines - overlap) {
    const chunkLines = lines.slice(index, index + maxLines);
    const chunkContent = chunkLines.join("\n").trim();

    if (!chunkContent) {
      continue;
    }

    chunks.push({
      filePath,
      language: getLanguage(filePath),
      startLine: index + 1,
      endLine: index + chunkLines.length,
      content: chunkContent,
      contentHash: hashContent(chunkContent),
      symbols: extractSymbols(chunkContent),
      metadata: {
        filePath,
        language: getLanguage(filePath)
      }
    });
  }

  return chunks;
}

async function getRepositoryWithFiles(repositoryId: string): Promise<RepositoryWithFiles> {
  const repository = await prisma.codeRepository.findUnique({
    where: { id: repositoryId },
    include: {
      files: {
        orderBy: {
          relativePath: "asc"
        }
      }
    }
  });

  if (!repository) {
    throw new AppError(404, "Repository not found");
  }

  if (repository.status !== "READY") {
    throw new AppError(400, "Repository is not ready for workflow analysis");
  }

  return repository;
}

async function readTextFile(repositoryId: string, relativePath: string) {
  const file = await repositoryService.getFileContent(repositoryId, relativePath);

  if (file.encoding !== "utf8") {
    return null;
  }

  return file.content;
}

async function ensureCodeChunksTable() {
  const table = getCodeChunksTable();

  await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS vector");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${table} (
      id TEXT PRIMARY KEY,
      repository_id TEXT NOT NULL,
      index_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      language TEXT NOT NULL,
      start_line INTEGER NOT NULL,
      end_line INTEGER NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      symbols TEXT[] NOT NULL DEFAULT '{}',
      metadata JSONB NOT NULL DEFAULT '{}',
      embedding vector,
      indexed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS code_chunks_repository_index_idx
    ON ${table} (repository_id, index_name)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS code_chunks_chunk_identity_idx
    ON ${table} (repository_id, index_name, file_path, start_line, end_line, content_hash)
  `);
}

async function countIndexedChunks(repositoryId: string, indexName: string) {
  const table = getCodeChunksTable();
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM ${table} WHERE repository_id = $1 AND index_name = $2`,
    repositoryId,
    indexName
  );

  return toNumber(rows[0]?.count);
}

async function indexRepository(input: {
  repositoryId: string;
  indexName: string;
  forceReindex?: boolean;
}): Promise<RepoIndexStatus> {
  await ensureCodeChunksTable();

  const repository = await getRepositoryWithFiles(input.repositoryId);
  const existingCount = await countIndexedChunks(repository.id, input.indexName);
  const embeddingClient = createEmbeddingClient();

  if (existingCount > 0 && !input.forceReindex) {
    return {
      indexName: input.indexName,
      exists: true,
      builtOrUpdated: false,
      indexedFiles: repository.files.filter(isSearchableFile).length,
      indexedChunks: existingCount,
      embeddingModel: embeddingClient.model,
      vectorStore: "postgresql_pgvector"
    };
  }

  const table = getCodeChunksTable();
  await prisma.$executeRawUnsafe(
    `DELETE FROM ${table} WHERE repository_id = $1 AND index_name = $2`,
    repository.id,
    input.indexName
  );

  const searchableFiles = repository.files.filter(isSearchableFile);
  let indexedFiles = 0;
  let indexedChunks = 0;

  for (const file of searchableFiles) {
    const content = await readTextFile(repository.id, file.relativePath);

    if (!content) {
      continue;
    }

    const chunks = chunkFile(file.relativePath, content).map((chunk) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        repositoryId: repository.id,
        repoPath: repository.rootPath,
        indexName: input.indexName,
        contentHash: chunk.contentHash
      }
    }));

    if (chunks.length === 0) {
      continue;
    }

    indexedFiles += 1;

    for (let offset = 0; offset < chunks.length; offset += 16) {
      const batch = chunks.slice(offset, offset + 16);
      const embeddings = await embeddingClient.embedDocuments(batch.map((chunk) => chunk.content));

      for (let batchIndex = 0; batchIndex < batch.length; batchIndex += 1) {
        const chunk = batch[batchIndex];
        const id = createHash("sha256")
          .update(`${repository.id}:${input.indexName}:${chunk.filePath}:${chunk.startLine}:${chunk.contentHash}`)
          .digest("hex");

        await prisma.$executeRawUnsafe(
          `
            INSERT INTO ${table} (
              id, repository_id, index_name, file_path, language, start_line, end_line,
              content, content_hash, symbols, metadata, embedding, indexed_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::text[], $11::jsonb, $12::vector, now())
            ON CONFLICT (id) DO UPDATE SET
              content = EXCLUDED.content,
              content_hash = EXCLUDED.content_hash,
              symbols = EXCLUDED.symbols,
              metadata = EXCLUDED.metadata,
              embedding = EXCLUDED.embedding,
              indexed_at = now()
          `,
          id,
          repository.id,
          input.indexName,
          chunk.filePath,
          chunk.language,
          chunk.startLine,
          chunk.endLine,
          chunk.content,
          chunk.contentHash,
          chunk.symbols,
          JSON.stringify(chunk.metadata),
          toPgVectorLiteral(embeddings[batchIndex])
        );
        indexedChunks += 1;
      }
    }
  }

  return {
    indexName: input.indexName,
    exists: true,
    builtOrUpdated: true,
    indexedFiles,
    indexedChunks,
    embeddingModel: embeddingClient.model,
    vectorStore: "postgresql_pgvector"
  };
}

export function generateQueryTerms(input: {
  ticketTitle?: string;
  ticketDescription: string;
  analysis: TicketAnalysis;
}) {
  const text = [
    input.ticketTitle,
    input.ticketDescription,
    input.analysis.summary,
    input.analysis.affectedFeature,
    input.analysis.suspectedFlow,
    ...input.analysis.keyFacts
  ]
    .filter(Boolean)
    .join(" ");

  const terms = text
    .toLowerCase()
    .split(/[^a-z0-9_-]+/)
    .map((term) => term.trim().replace(/^[-_]+|[-_]+$/g, ""))
    .filter((term) => term.length > 2 && !stopWords.has(term));

  return [...new Set(terms)].slice(0, 30);
}

export function generateSemanticQuery(input: {
  ticketTitle?: string;
  ticketDescription: string;
  analysis: TicketAnalysis;
  priority: PriorityClassification;
}) {
  return [
    input.ticketTitle,
    input.analysis.summary,
    ...input.analysis.keyFacts.slice(0, 5),
    input.analysis.affectedFeature,
    input.analysis.suspectedFlow,
    `${input.priority.level} priority: ${input.priority.reason}`
  ]
    .filter(Boolean)
    .join("; ")
    .slice(0, 1200);
}

function buildSnippet(lines: string[], startLineIndex: number) {
  const from = Math.max(0, startLineIndex - 2);
  const to = Math.min(lines.length, startLineIndex + 4);
  return lines.slice(from, to).join("\n").slice(0, 1200);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasTokenMatch(text: string, term: string) {
  return new RegExp(`(^|[^a-z0-9_])${escapeRegExp(term)}([^a-z0-9_]|$)`, "i").test(text);
}

async function keywordSearch(input: RepoSearchInput): Promise<RepoSearchResult[]> {
  const repository = await getRepositoryWithFiles(input.repositoryId);
  const normalizedTerms = input.queryTerms.map((term) => term.toLowerCase());
  const results: RepoSearchResult[] = [];

  if (normalizedTerms.length === 0) {
    return [];
  }

  for (const file of repository.files.filter(isSearchableFile)) {
    const content = await readTextFile(repository.id, file.relativePath);

    if (!content) {
      continue;
    }

    const lowerPath = file.relativePath.toLowerCase();
    const lines = content.split(/\r?\n/);
    const matchedLines: { lineNumber: number; text: string }[] = [];
    let score = 0;

    for (const term of normalizedTerms) {
      if (lowerPath.includes(term)) {
        score += path.basename(lowerPath).includes(term) ? 4 : 2;
      }
    }

    lines.forEach((line, index) => {
      const matches = normalizedTerms.filter((term) => hasTokenMatch(line, term));

      if (matches.length > 0) {
        matchedLines.push({
          lineNumber: index + 1,
          text: line.trim().slice(0, 240)
        });
        score += matches.length;

        if (/\b(class|function|public|private|protected|export|servlet|controller|dao|service)\b/i.test(line)) {
          score += 1.5;
        }
      }
    });

    if (score <= 0) {
      continue;
    }

    const firstMatch = matchedLines[0]?.lineNumber ?? 1;
    results.push({
      filePath: file.relativePath,
      score,
      matchType: lowerPath.split("/").some((part) => normalizedTerms.some((term) => part.includes(term)))
        ? "filename"
        : "keyword",
      startLine: firstMatch,
      endLine: Math.min(lines.length, firstMatch + 5),
      matchedLines: matchedLines.slice(0, 8),
      snippet: buildSnippet(lines, firstMatch - 1),
      symbols: extractSymbols(content).slice(0, 12),
      metadata: {
        repositoryId: repository.id,
        searchProvider: "keyword"
      }
    });
  }

  return results.sort((left, right) => right.score - left.score).slice(0, Math.max(input.maxResults * 2, 10));
}

async function vectorSearch(input: RepoSearchInput): Promise<RepoSearchResult[]> {
  const table = getCodeChunksTable();
  const embeddingClient = createEmbeddingClient();
  const embedding = await embeddingClient.embedQuery(input.semanticQuery);
  const rows = await prisma.$queryRawUnsafe<
    {
      id: string;
      filePath: string;
      startLine: number;
      endLine: number;
      content: string;
      symbols: string[];
      metadata: Record<string, unknown>;
      score: number;
    }[]
  >(
    `
      SELECT
        id,
        file_path AS "filePath",
        start_line AS "startLine",
        end_line AS "endLine",
        content,
        symbols,
        metadata,
        (1 - (embedding <=> $1::vector))::float AS score
      FROM ${table}
      WHERE repository_id = $2 AND index_name = $3 AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $4
    `,
    toPgVectorLiteral(embedding),
    input.repositoryId,
    input.indexName,
    Math.max(input.maxResults * 2, 10)
  );

  return rows.map((row) => ({
    filePath: row.filePath,
    score: Number(row.score),
    matchType: "semantic",
    chunkId: row.id,
    startLine: row.startLine,
    endLine: row.endLine,
    snippet: row.content.slice(0, 1200),
    symbols: toStringArray(row.symbols),
    metadata: {
      ...row.metadata,
      searchProvider: "pgvector"
    }
  }));
}

function mergeResults(results: RepoSearchResult[][], maxResults: number) {
  const merged = new Map<string, RepoSearchResult>();

  for (const providerResults of results) {
    for (const result of providerResults) {
      const key = result.chunkId ?? `${result.filePath}:${result.startLine ?? 0}:${result.endLine ?? 0}`;
      const existing = merged.get(key);

      if (!existing) {
        merged.set(key, result);
        continue;
      }

      merged.set(key, {
        ...existing,
        score: existing.score + result.score + 2,
        matchType: "hybrid",
        matchedLines: existing.matchedLines ?? result.matchedLines,
        snippet: existing.snippet ?? result.snippet,
        symbols: [...new Set([...(existing.symbols ?? []), ...(result.symbols ?? [])])],
        metadata: {
          ...existing.metadata,
          ...result.metadata,
          mergedProviders: true
        }
      });
    }
  }

  return [...merged.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, maxResults)
    .map((result) => ({
      ...result,
      score: Number(result.score.toFixed(4))
    }));
}

export const repoSearchService = {
  async buildIndex(input: { repositoryId: string; indexName: string; forceReindex?: boolean }) {
    return indexRepository(input);
  },

  async search(input: RepoSearchInput) {
    const warnings: string[] = [];
    let indexStatus: RepoIndexStatus = {
      indexName: input.indexName,
      exists: false,
      builtOrUpdated: false,
      vectorStore: "postgresql_pgvector"
    };
    const providerResults: RepoSearchResult[][] = [];

    if (input.strategy !== "keyword") {
      try {
        indexStatus = await indexRepository({
          repositoryId: input.repositoryId,
          indexName: input.indexName,
          forceReindex: input.forceReindex
        });
        providerResults.push(await vectorSearch(input));
      } catch (error) {
        warnings.push(
          `Vector search unavailable; using keyword search where possible. ${
            error instanceof Error ? error.message : "Unknown vector error"
          }`
        );
      }
    }

    if (input.strategy !== "vector") {
      providerResults.push(await keywordSearch(input));
    }

    const results = mergeResults(providerResults, input.maxResults);

    if (results.length === 0) {
      warnings.push("No relevant repository snippets were found.");
    }

    if (providerResults.length === 0) {
      throw new AppError(500, "Both vector search and keyword search are unavailable");
    }

    return {
      indexStatus,
      results,
      warnings
    };
  }
};
