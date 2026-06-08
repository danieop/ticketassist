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

const CHUNKING_VERSION = "structure-v2";
const STRUCTURE_CHUNK_MAX_LINES = 96;
const STRUCTURE_CHUNK_OVERLAP = 18;
const FALLBACK_CHUNK_MAX_LINES = 120;
const FALLBACK_CHUNK_OVERLAP = 15;

const queryExpansionMap = new Map<string, string[]>([
  ["auth", ["login", "signin", "session", "token", "credential"]],
  ["api", ["endpoint", "request", "response", "handler", "route"]],
  ["cache", ["ttl", "invalidate", "stale", "memo", "stored"]],
  ["checkout", ["order", "cart", "payment", "billing", "invoice"]],
  ["config", ["setting", "option", "env", "flag"]],
  ["database", ["query", "schema", "model", "repository", "migration"]],
  ["email", ["mail", "notification", "message", "smtp"]],
  ["file", ["upload", "attachment", "storage", "document"]],
  ["filter", ["query", "search", "match", "select"]],
  ["job", ["queue", "worker", "retry", "background"]],
  ["login", ["auth", "session", "token", "credential"]],
  ["notification", ["alert", "email", "webhook", "message"]],
  ["order", ["checkout", "payment", "invoice", "transaction"]],
  ["payment", ["checkout", "order", "billing", "transaction"]],
  ["render", ["ui", "view", "component", "template"]],
  ["search", ["index", "query", "filter", "rank"]],
  ["timeout", ["retry", "wait", "delay", "pending", "hang"]],
  ["upload", ["file", "attachment", "storage", "document"]]
]);

type ChunkProfile = "code" | "markdown" | "sql" | "config" | "text";
type ChunkBoundary = {
  startLine: number;
  chunkType: string;
  symbol?: string;
};
type ChunkSearchSource = "vector" | "keyword";

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

function getChunkingProfile(filePath: string): ChunkProfile {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".md") {
    return "markdown";
  }

  if (extension === ".sql") {
    return "sql";
  }

  if ([".json", ".yml", ".yaml", ".properties", ".xml"].includes(extension)) {
    return "config";
  }

  if ([".html", ".css", ".scss"].includes(extension)) {
    return "text";
  }

  return "code";
}

function getPrimaryChunkType(filePath: string) {
  const profile = getChunkingProfile(filePath);

  if (profile === "markdown") {
    return "section";
  }

  if (profile === "sql") {
    return "statement";
  }

  if (profile === "config") {
    return "config";
  }

  if (profile === "text") {
    return "block";
  }

  return "code";
}

function detectChunkBoundary(filePath: string, line: string): ChunkBoundary | null {
  const trimmed = line.trim();

  if (!trimmed) {
    return null;
  }

  const profile = getChunkingProfile(filePath);

  if (profile === "markdown") {
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      return {
        startLine: 0,
        chunkType: `heading-${headingMatch[1].length}`,
        symbol: headingMatch[2].trim()
      };
    }

    return null;
  }

  if (profile === "sql") {
    if (/^(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|WITH|SELECT|MERGE)\b/i.test(trimmed)) {
      const symbolMatch = trimmed.match(
        /^(?:CREATE\s+(?:OR\s+REPLACE\s+)?)?(?:TABLE|VIEW|INDEX|FUNCTION|PROCEDURE|TRIGGER|PACKAGE|SCHEMA)?\s*([A-Za-z_][\w.]*)?/i
      );

      return {
        startLine: 0,
        chunkType: "statement",
        symbol: symbolMatch?.[1]?.trim()
      };
    }

    return null;
  }

  if (profile === "config") {
    const keyMatch = trimmed.match(/^(?:[A-Za-z0-9_.-]+|"[^"]+")\s*:\s*(?:#.*)?$/);

    if (keyMatch) {
      return {
        startLine: 0,
        chunkType: "config",
        symbol: keyMatch[0].replace(/:\s*(?:#.*)?$/, "").replace(/^"|"$/g, "").trim()
      };
    }

    return null;
  }

  const codePatterns: Array<{ regex: RegExp; chunkType: string }> = [
    {
      regex: /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\b/,
      chunkType: "function"
    },
    {
      regex: /^(?:export\s+)?class\s+([A-Za-z_$][\w$]*)\b/,
      chunkType: "class"
    },
    {
      regex: /^(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)\b/,
      chunkType: "interface"
    },
    {
      regex: /^(?:export\s+)?enum\s+([A-Za-z_$][\w$]*)\b/,
      chunkType: "enum"
    },
    {
      regex: /^def\s+([A-Za-z_$][\w$]*)\s*\(/,
      chunkType: "function"
    },
    {
      regex: /^fn\s+([A-Za-z_$][\w$]*)\s*\(/,
      chunkType: "function"
    },
    {
      regex:
        /^(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?(?:synchronized\s+)?(?:[A-Za-z_$][\w$<>,\[\].?\s]*\s+)+([A-Za-z_$][\w$]*)\s*\([^;{]*\)\s*(?:throws\s+[A-Za-z_$][\w$<>,\s.]*)?\s*\{?\s*$/,
      chunkType: "method"
    },
    {
      regex: /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*=>)/,
      chunkType: "function"
    }
  ];

  for (const pattern of codePatterns) {
    const match = trimmed.match(pattern.regex);

    if (match) {
      return {
        startLine: 0,
        chunkType: pattern.chunkType,
        symbol: match[1]?.trim()
      };
    }
  }

  if (/^<\s*(?:script|style|form|section|article|main|aside|nav|header|footer|div|table|ul|ol|li|p|h[1-6])\b/i.test(trimmed)) {
    return {
      startLine: 0,
      chunkType: "markup",
      symbol: trimmed.replace(/[<>\s].*$/, "").replace(/^</, "").trim()
    };
  }

  return null;
}

function buildChunk(
  filePath: string,
  lines: string[],
  startLine: number,
  endLine: number,
  chunkType: string,
  symbol?: string
) {
  const clampedStart = Math.max(1, startLine);
  const clampedEnd = Math.min(lines.length, endLine);
  const content = lines.slice(clampedStart - 1, clampedEnd).join("\n").trim();

  if (!content) {
    return null;
  }

  const extractedSymbols = extractSymbols(content);
  const symbols = [...new Set([symbol, ...extractedSymbols].filter((value): value is string => Boolean(value)))].slice(
    0,
    20
  );
  const language = getLanguage(filePath);

  return {
    filePath,
    language,
    startLine: clampedStart,
    endLine: clampedEnd,
    content,
    contentHash: hashContent(content),
    symbols,
    metadata: {
      filePath,
      language,
      chunkType,
      primarySymbol: symbol ?? null,
      chunkingVersion: CHUNKING_VERSION
    }
  } satisfies CodeChunk;
}

function splitChunkRange(
  filePath: string,
  lines: string[],
  startLine: number,
  endLine: number,
  chunkType: string,
  symbol?: string
) {
  const chunks: CodeChunk[] = [];
  const maxLines = getChunkingProfile(filePath) === "code" ? STRUCTURE_CHUNK_MAX_LINES : FALLBACK_CHUNK_MAX_LINES;
  const overlap = getChunkingProfile(filePath) === "code" ? STRUCTURE_CHUNK_OVERLAP : FALLBACK_CHUNK_OVERLAP;

  for (let index = startLine; index <= endLine; index += Math.max(1, maxLines - overlap)) {
    const chunk = buildChunk(filePath, lines, index, Math.min(endLine, index + maxLines - 1), chunkType, symbol);

    if (chunk) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

function chunkFile(filePath: string, content: string): CodeChunk[] {
  const lines = content.split(/\r?\n/);
  const profile = getChunkingProfile(filePath);
  const boundaries: ChunkBoundary[] = [];

  lines.forEach((line, index) => {
    const boundary = detectChunkBoundary(filePath, line);

    if (boundary) {
      boundaries.push({
        ...boundary,
        startLine: index + 1
      });
    }
  });

  if (boundaries.length === 0) {
    return splitChunkRange(filePath, lines, 1, lines.length, getPrimaryChunkType(filePath));
  }

  const chunks: CodeChunk[] = [];
  const orderedBoundaries = boundaries
    .filter((boundary, index, all) => index === 0 || boundary.startLine !== all[index - 1].startLine)
    .sort((left, right) => left.startLine - right.startLine);

  if (orderedBoundaries[0].startLine > 1) {
    const preamble = buildChunk(filePath, lines, 1, orderedBoundaries[0].startLine - 1, "header");

    if (preamble) {
      chunks.push(preamble);
    }
  }

  orderedBoundaries.forEach((boundary, index) => {
    const startLine = boundary.startLine;
    const nextBoundary = orderedBoundaries[index + 1];
    const endLine = nextBoundary ? nextBoundary.startLine - 1 : lines.length;
    const chunk = buildChunk(filePath, lines, startLine, endLine, boundary.chunkType, boundary.symbol);

    if (!chunk) {
      return;
    }

    if (chunk.endLine - chunk.startLine + 1 > (profile === "code" ? STRUCTURE_CHUNK_MAX_LINES : FALLBACK_CHUNK_MAX_LINES)) {
      chunks.push(...splitChunkRange(filePath, lines, chunk.startLine, chunk.endLine, boundary.chunkType, boundary.symbol));
      return;
    }

    chunks.push(chunk);
  });

  return chunks.length > 0 ? chunks : splitChunkRange(filePath, lines, 1, lines.length, getPrimaryChunkType(filePath));
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

async function countIndexedChunks(repositoryId: string, indexName: string, chunkingVersion = CHUNKING_VERSION) {
  const table = getCodeChunksTable();
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count
     FROM ${table}
     WHERE repository_id = $1
       AND index_name = $2
       AND COALESCE(metadata->>'chunkingVersion', '') = $3`,
    repositoryId,
    indexName,
    chunkingVersion
  );

  return toNumber(rows[0]?.count);
}

async function countAllIndexedChunks(repositoryId: string, indexName: string) {
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
  const currentVersionCount = await countIndexedChunks(repository.id, input.indexName);
  const existingCount = await countAllIndexedChunks(repository.id, input.indexName);
  const embeddingClient = createEmbeddingClient();

  if (currentVersionCount > 0 && currentVersionCount === existingCount && !input.forceReindex) {
    return {
      indexName: input.indexName,
      exists: true,
      builtOrUpdated: false,
      indexedFiles: repository.files.filter(isSearchableFile).length,
      indexedChunks: currentVersionCount,
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

  return expandQueryTerms([...new Set(terms)]).slice(0, 40);
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

function expandQueryTerms(terms: string[]) {
  const expanded = new Set<string>();

  for (const term of terms) {
    expanded.add(term);

    for (const alias of queryExpansionMap.get(term) ?? []) {
      if (alias.length > 2 && !stopWords.has(alias)) {
        expanded.add(alias);
      }
    }
  }

  return [...expanded];
}

function buildSnippet(lines: string[], startLineIndex: number) {
  const from = Math.max(0, startLineIndex - 2);
  const to = Math.min(lines.length, startLineIndex + 4);
  return lines.slice(from, to).join("\n").slice(0, 1200);
}

function buildChunkId(repositoryId: string, indexName: string, chunk: CodeChunk) {
  return createHash("sha256")
    .update(`${repositoryId}:${indexName}:${chunk.filePath}:${chunk.startLine}:${chunk.contentHash}`)
    .digest("hex");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasTokenMatch(text: string, term: string) {
  return new RegExp(`(^|[^a-z0-9_])${escapeRegExp(term)}([^a-z0-9_]|$)`, "i").test(text);
}

function mergeMatchedLines(
  existing: { lineNumber: number; text: string }[] | undefined,
  incoming: { lineNumber: number; text: string }[] | undefined
) {
  return [...new Map([...(existing ?? []), ...(incoming ?? [])].map((line) => [`${line.lineNumber}:${line.text}`, line])).values()].slice(0, 8);
}

function normalizeProviderScore(result: RepoSearchResult, source: ChunkSearchSource, rank: number) {
  const rawScore = Number.isFinite(result.score) ? Math.max(0, result.score) : 0;
  const baseScore = source === "vector" ? Math.min(1, rawScore) : rawScore / (rawScore + 6);
  const rankScore = 1 / (rank + (source === "vector" ? 8 : 12));
  const typeBoost = result.matchType === "filename" ? 0.12 : result.matchType === "hybrid" ? 0.1 : 0.05;

  return baseScore + rankScore + typeBoost;
}

function scoreKeywordChunk(chunk: CodeChunk, normalizedTerms: string[]) {
  const lowerPath = chunk.filePath.toLowerCase();
  const lowerBaseName = path.basename(lowerPath);
  const lowerContent = chunk.content.toLowerCase();
  const lowerSymbols = (chunk.symbols ?? []).join(" ").toLowerCase();
  const chunkType = typeof chunk.metadata.chunkType === "string" ? chunk.metadata.chunkType : "";
  const lines = chunk.content.split(/\r?\n/);
  const matchedTerms = new Set<string>();
  const matchedLines: { lineNumber: number; text: string }[] = [];
  let score = 0;

  for (const term of normalizedTerms) {
    if (lowerBaseName.includes(term)) {
      score += 4;
      matchedTerms.add(term);
    } else if (lowerPath.includes(term)) {
      score += 2.5;
      matchedTerms.add(term);
    }

    if (hasTokenMatch(lowerSymbols, term)) {
      score += 3.5;
      matchedTerms.add(term);
    } else if (lowerContent.includes(term)) {
      score += 0.6;
    }
  }

  lines.forEach((line, index) => {
    const lineMatches = normalizedTerms.filter((term) => hasTokenMatch(line, term));

    if (lineMatches.length === 0) {
      return;
    }

    matchedLines.push({
      lineNumber: chunk.startLine + index,
      text: line.trim().slice(0, 240)
    });

    score += lineMatches.length * 1.2;

    if (/\b(class|function|interface|enum|export|public|private|protected|service|controller|dao|router|route|test)\b/i.test(line)) {
      score += 1.8;
    }

    if (index < 3) {
      score += 0.35;
    }
  });

  if (matchedTerms.size > 0 && chunkType && chunkType !== "header") {
    score += 0.5;
  }

  const focusedLengthPenalty = Math.max(0, (lines.length - 55) / 180);
  const finalScore = Math.max(0, score - focusedLengthPenalty);
  const firstMatch = matchedLines[0]?.lineNumber ?? chunk.startLine;
  const hasContentHits = matchedLines.length > 0;

  return {
    score: finalScore,
    matchType: hasContentHits ? "keyword" : "filename",
    matchedLines,
    firstMatch,
    snippet: hasContentHits ? buildSnippet(lines, Math.max(0, firstMatch - chunk.startLine)) : chunk.content.slice(0, 1200)
  } satisfies Pick<RepoSearchResult, "score" | "matchType" | "matchedLines" | "snippet"> & { firstMatch: number };
}

async function keywordSearch(input: RepoSearchInput): Promise<RepoSearchResult[]> {
  const repository = await getRepositoryWithFiles(input.repositoryId);
  const normalizedTerms = [...new Set(input.queryTerms.map((term) => term.toLowerCase()))];
  const results: RepoSearchResult[] = [];

  if (normalizedTerms.length === 0) {
    return [];
  }

  for (const file of repository.files.filter(isSearchableFile)) {
    const content = await readTextFile(repository.id, file.relativePath);

    if (!content) {
      continue;
    }

    const chunks = chunkFile(file.relativePath, content);

    for (const chunk of chunks) {
      const scored = scoreKeywordChunk(chunk, normalizedTerms);

      if (scored.score <= 0) {
        continue;
      }

      results.push({
        filePath: chunk.filePath,
        score: scored.score,
        matchType: scored.matchType,
        chunkId: buildChunkId(repository.id, input.indexName, chunk),
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        matchedLines: scored.matchedLines.slice(0, 8),
        snippet: scored.snippet,
        symbols: chunk.symbols.slice(0, 12),
        metadata: {
          ...chunk.metadata,
          repositoryId: repository.id,
          repoPath: repository.rootPath,
          indexName: input.indexName,
          searchProvider: "keyword"
        }
      });
    }
  }

  return results.sort((left, right) => right.score - left.score).slice(0, Math.max(input.maxResults * 3, 12));
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
    Math.max(input.maxResults * 3, 12)
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

function mergeResults(
  results: { source: ChunkSearchSource; items: RepoSearchResult[] }[],
  maxResults: number
) {
  const merged = new Map<string, RepoSearchResult>();

  for (const providerResults of results) {
    for (const [index, result] of providerResults.items.entries()) {
      const key = result.chunkId ?? `${result.filePath}:${result.startLine ?? 0}:${result.endLine ?? 0}`;
      const existing = merged.get(key);
      const candidateScore = normalizeProviderScore(result, providerResults.source, index + 1);

      if (!existing) {
        merged.set(key, {
          ...result,
          score: candidateScore,
          metadata: {
            ...result.metadata,
            retrievalSources: [providerResults.source],
            providerScores: {
              [providerResults.source]: candidateScore
            }
          }
        });
        continue;
      }

      const existingMetadata = (existing.metadata ?? {}) as Record<string, unknown>;
      const previousProviderScores = (existingMetadata.providerScores as Record<string, number>) ?? {};
      const previousSources = Array.isArray(existingMetadata.retrievalSources)
        ? existingMetadata.retrievalSources.filter((value): value is string => typeof value === "string")
        : [];

      merged.set(key, {
        ...existing,
        score: existing.score + candidateScore + 0.2,
        matchType: "hybrid",
        matchedLines: mergeMatchedLines(existing.matchedLines, result.matchedLines),
        snippet:
          existing.snippet && existing.snippet.length >= (result.snippet?.length ?? 0) ? existing.snippet : result.snippet,
        symbols: [...new Set([...(existing.symbols ?? []), ...(result.symbols ?? [])])],
        metadata: {
          ...existing.metadata,
          ...result.metadata,
          mergedProviders: true,
          retrievalSources: [...new Set([...previousSources, providerResults.source])],
          providerScores: {
            ...previousProviderScores,
            [providerResults.source]: candidateScore
          }
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
    const providerResults: { source: ChunkSearchSource; items: RepoSearchResult[] }[] = [];

    if (input.strategy !== "keyword") {
      try {
        indexStatus = await indexRepository({
          repositoryId: input.repositoryId,
          indexName: input.indexName,
          forceReindex: input.forceReindex
        });
        providerResults.push({
          source: "vector",
          items: await vectorSearch(input)
        });
      } catch (error) {
        warnings.push(
          `Vector search unavailable; using keyword search where possible. ${
            error instanceof Error ? error.message : "Unknown vector error"
          }`
        );
      }
    }

    if (input.strategy !== "vector") {
      providerResults.push({
        source: "keyword",
        items: await keywordSearch(input)
      });
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
