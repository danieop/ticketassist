import { createHash } from "node:crypto";
import path from "node:path";
import type { CodeRepository, CodeRepositoryFile } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../middlewares/error-handler.js";
import { createEmbeddingClient, toPgVectorLiteral } from "./embedding.service.js";
import { redactText } from "./redaction.service.js";
import { repositoryService } from "./repository.service.js";
import type {
  PriorityClassification,
  RepoSearchResult,
  RetrievalStrategy,
  TicketAnalysis
} from "./workflow-state.js";

// Denylist: binary, media, compiled, and non-text files that should never be indexed.
// Everything else (all programming languages, config formats, docs) is indexed by default.
const excludedExtensions = new Set([
  // Images
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".svg", ".webp", ".tiff", ".tif", ".avif",
  // Videos & Audio
  ".mp4", ".avi", ".mov", ".mkv", ".mp3", ".wav", ".flac", ".ogg", ".webm",
  // Fonts
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  // Compiled / Binary
  ".exe", ".dll", ".so", ".dylib", ".o", ".obj", ".class", ".pyc", ".pyo",
  ".wasm", ".bin", ".dat", ".lib", ".a",
  // Archives
  ".zip", ".tar", ".gz", ".bz2", ".xz", ".7z", ".rar", ".jar", ".war", ".ear",
  // Documents / Office
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  // Databases
  ".db", ".sqlite", ".sqlite3", ".mdb",
  // Source maps & certs
  ".map", ".pem", ".cer", ".crt", ".key", ".p12", ".pfx",
  // IDE / OS artifacts
  ".DS_Store",
  // Misc binary
  ".iso", ".dmg", ".img", ".deb", ".rpm", ".msi", ".cab",
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

const CHUNKING_VERSION = "symbol-v1";
const HEURISTIC_STRUCTURE_SOURCE = "heuristic-structure";
const HEURISTIC_FALLBACK_SOURCE = "heuristic-fallback";
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
  parserSource?: string;
  confidence?: number;
};
type ChunkSearchSource = "vector" | "keyword";
type GraphNode = {
  id: string;
  label: string;
  kind: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
  language?: string;
  layer?: string;
  confidence?: number;
};
type GraphEdge = {
  from: string;
  to: string;
  type: string;
  confidence?: number;
  evidence?: string;
};

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
  chunkingVersion?: string;
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
    !excludedExtensions.has(extension) &&
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

function buildSymbolPath(filePath: string, symbol: string | undefined, chunkKind: string, startLine: number) {
  return symbol ? `${filePath}#${symbol}` : `${filePath}#${chunkKind}:${startLine}`;
}

function getSymbolConfidence(input: {
  chunkKind: string;
  parserSource: string;
  symbol?: string;
  confidence?: number;
}) {
  if (typeof input.confidence === "number") {
    return input.confidence;
  }

  if (input.parserSource === HEURISTIC_FALLBACK_SOURCE) {
    return input.symbol ? 0.45 : 0.3;
  }

  if (input.symbol && ["class", "interface", "enum", "function", "method"].includes(input.chunkKind)) {
    return 0.72;
  }

  if (input.symbol) {
    return 0.6;
  }

  return 0.4;
}

function inferLayer(filePath: string, symbols: string[] = []) {
  const text = `${filePath} ${symbols.join(" ")}`.toLowerCase();

  if (/\b(controller|servlet|route|router|handler|endpoint|page)\b/.test(text)) {
    return "controller";
  }

  if (/\b(service|usecase|interactor|manager)\b/.test(text)) {
    return "service";
  }

  if (/\b(dao|repository|repo|mapper|dal|gateway)\b/.test(text)) {
    return "dao";
  }

  if (/\b(model|entity|dto|schema|domain|viewmodel)\b/.test(text)) {
    return "model";
  }

  if (/\b(test|spec)\b/.test(text)) {
    return "test";
  }

  return undefined;
}

function getMetadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : undefined;
}

function getMetadataNumber(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "number" ? value : undefined;
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
  symbol?: string,
  parserSource = HEURISTIC_STRUCTURE_SOURCE,
  confidence?: number
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
  const symbolPath = buildSymbolPath(filePath, symbol, chunkType, clampedStart);
  const symbolConfidence = getSymbolConfidence({
    chunkKind: chunkType,
    parserSource,
    symbol,
    confidence
  });

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
      chunkKind: chunkType,
      primarySymbol: symbol ?? null,
      symbolPath,
      symbolPathParts: symbol ? [filePath, symbol] : [filePath, `${chunkType}:${clampedStart}`],
      parserSource,
      parserVersion: CHUNKING_VERSION,
      symbolConfidence,
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
  symbol?: string,
  parserSource = HEURISTIC_STRUCTURE_SOURCE,
  confidence?: number
) {
  const chunks: CodeChunk[] = [];
  const maxLines = getChunkingProfile(filePath) === "code" ? STRUCTURE_CHUNK_MAX_LINES : FALLBACK_CHUNK_MAX_LINES;
  const overlap = getChunkingProfile(filePath) === "code" ? STRUCTURE_CHUNK_OVERLAP : FALLBACK_CHUNK_OVERLAP;

  for (let index = startLine; index <= endLine; index += Math.max(1, maxLines - overlap)) {
    const chunk = buildChunk(
      filePath,
      lines,
      index,
      Math.min(endLine, index + maxLines - 1),
      chunkType,
      symbol,
      parserSource,
      confidence
    );

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
        startLine: index + 1,
        parserSource: boundary.parserSource ?? HEURISTIC_STRUCTURE_SOURCE,
        confidence: boundary.confidence
      });
    }
  });

  if (boundaries.length === 0) {
    return splitChunkRange(
      filePath,
      lines,
      1,
      lines.length,
      getPrimaryChunkType(filePath),
      undefined,
      HEURISTIC_FALLBACK_SOURCE,
      0.3
    );
  }

  const chunks: CodeChunk[] = [];
  const orderedBoundaries = boundaries
    .filter((boundary, index, all) => index === 0 || boundary.startLine !== all[index - 1].startLine)
    .sort((left, right) => left.startLine - right.startLine);

  if (orderedBoundaries[0].startLine > 1) {
    const preamble = buildChunk(
      filePath,
      lines,
      1,
      orderedBoundaries[0].startLine - 1,
      "header",
      undefined,
      HEURISTIC_FALLBACK_SOURCE,
      0.35
    );

    if (preamble) {
      chunks.push(preamble);
    }
  }

  orderedBoundaries.forEach((boundary, index) => {
    const startLine = boundary.startLine;
    const nextBoundary = orderedBoundaries[index + 1];
    const endLine = nextBoundary ? nextBoundary.startLine - 1 : lines.length;
    const chunk = buildChunk(
      filePath,
      lines,
      startLine,
      endLine,
      boundary.chunkType,
      boundary.symbol,
      boundary.parserSource ?? HEURISTIC_STRUCTURE_SOURCE,
      boundary.confidence
    );

    if (!chunk) {
      return;
    }

    if (chunk.endLine - chunk.startLine + 1 > (profile === "code" ? STRUCTURE_CHUNK_MAX_LINES : FALLBACK_CHUNK_MAX_LINES)) {
      chunks.push(
        ...splitChunkRange(
          filePath,
          lines,
          chunk.startLine,
          chunk.endLine,
          boundary.chunkType,
          boundary.symbol,
          boundary.parserSource ?? HEURISTIC_STRUCTURE_SOURCE,
          boundary.confidence
        )
      );
      return;
    }

    chunks.push(chunk);
  });

  return chunks.length > 0
    ? chunks
    : splitChunkRange(
        filePath,
        lines,
        1,
        lines.length,
        getPrimaryChunkType(filePath),
        undefined,
        HEURISTIC_FALLBACK_SOURCE,
        0.3
      );
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
      chunkingVersion: CHUNKING_VERSION,
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
    chunkingVersion: CHUNKING_VERSION,
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
  priority?: PriorityClassification;
}) {
  return [
    input.ticketTitle,
    input.analysis.summary,
    ...input.analysis.keyFacts.slice(0, 5),
    input.analysis.affectedFeature,
    input.analysis.suspectedFlow,
    input.priority ? `${input.priority.level} priority: ${input.priority.reason}` : undefined
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
  const chunkType =
    typeof chunk.metadata.chunkKind === "string"
      ? chunk.metadata.chunkKind
      : typeof chunk.metadata.chunkType === "string"
        ? chunk.metadata.chunkType
        : "";
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
      const symbolBoost = (result.symbols?.length ?? 0) > 0 ? 0.08 : 0;
      const layerBoost = inferLayer(result.filePath, result.symbols) ? 0.05 : 0;
      const candidateScore = normalizeProviderScore(result, providerResults.source, index + 1) + symbolBoost + layerBoost;

      if (!existing) {
        merged.set(key, {
          ...result,
          score: candidateScore,
          metadata: {
            ...result.metadata,
            retrievalSources: [providerResults.source],
            providerScores: {
              [providerResults.source]: candidateScore
            },
            scoreSignals: {
              symbolBoost,
              layerBoost
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
          },
          scoreSignals: {
            ...((existingMetadata.scoreSignals as Record<string, number>) ?? {}),
            symbolBoost: Math.max(Number((existingMetadata.scoreSignals as Record<string, number>)?.symbolBoost ?? 0), symbolBoost),
            layerBoost: Math.max(Number((existingMetadata.scoreSignals as Record<string, number>)?.layerBoost ?? 0), layerBoost),
            overlapBoost: 0.2
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

function redactSearchResult(result: RepoSearchResult): RepoSearchResult {
  return {
    ...result,
    snippet: result.snippet ? redactText(result.snippet) : undefined,
    matchedLines: result.matchedLines?.map((line) => ({
      ...line,
      text: redactText(line.text)
    }))
  };
}

function buildDependencyGraph(results: RepoSearchResult[]) {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  for (const result of results) {
    const metadata = result.metadata ?? {};
    const symbolPath = getMetadataString(metadata, "symbolPath");
    const chunkKind = getMetadataString(metadata, "chunkKind") ?? getMetadataString(metadata, "chunkType") ?? "chunk";
    const primarySymbol = getMetadataString(metadata, "primarySymbol");
    const nodeId = symbolPath ?? `${result.filePath}:${result.startLine ?? 1}:${result.endLine ?? result.startLine ?? 1}`;
    const layer = inferLayer(result.filePath, result.symbols);

    nodes.set(nodeId, {
      id: nodeId,
      label: primarySymbol ?? result.symbols?.[0] ?? path.basename(result.filePath),
      kind: chunkKind,
      filePath: result.filePath,
      startLine: result.startLine,
      endLine: result.endLine,
      language: getMetadataString(metadata, "language"),
      layer,
      confidence: getMetadataNumber(metadata, "symbolConfidence") ?? 0.45
    });

    for (const symbol of result.symbols ?? []) {
      const symbolNodeId = `${result.filePath}#${symbol}`;

      if (!nodes.has(symbolNodeId)) {
        nodes.set(symbolNodeId, {
          id: symbolNodeId,
          label: symbol,
          kind: "symbol",
          filePath: result.filePath,
          language: getMetadataString(metadata, "language"),
          layer,
          confidence: 0.55
        });
      }

      if (symbolNodeId !== nodeId) {
        edges.push({
          from: nodeId,
          to: symbolNodeId,
          type: "contains",
          confidence: 0.55,
          evidence: "Symbol appeared in chunk metadata"
        });
      }
    }
  }

  const nodeValues = [...nodes.values()].slice(0, 80);
  const layerGroups = new Map<string, GraphNode[]>();

  for (const node of nodeValues) {
    if (!node.layer) {
      continue;
    }

    layerGroups.set(node.layer, [...(layerGroups.get(node.layer) ?? []), node]);
  }

  const controllers = layerGroups.get("controller") ?? [];
  const services = layerGroups.get("service") ?? [];
  const daos = layerGroups.get("dao") ?? [];
  const models = layerGroups.get("model") ?? [];

  for (const controller of controllers.slice(0, 8)) {
    for (const service of services.slice(0, 8)) {
      edges.push({
        from: controller.id,
        to: service.id,
        type: "routes_to",
        confidence: 0.35,
        evidence: "Layer proximity inferred from retrieved context"
      });
    }
  }

  for (const service of services.slice(0, 8)) {
    for (const dao of daos.slice(0, 8)) {
      edges.push({
        from: service.id,
        to: dao.id,
        type: "calls",
        confidence: 0.32,
        evidence: "Layer proximity inferred from retrieved context"
      });
    }
  }

  for (const dao of daos.slice(0, 8)) {
    for (const model of models.slice(0, 8)) {
      edges.push({
        from: dao.id,
        to: model.id,
        type: "reads_from",
        confidence: 0.3,
        evidence: "Layer proximity inferred from retrieved context"
      });
    }
  }

  return {
    nodes: nodeValues,
    edges: edges.slice(0, 120),
    generatedAt: new Date().toISOString()
  };
}

async function findTicketMemoryMatches(input: RepoSearchInput) {
  const queryTerms = input.queryTerms.map((term) => term.toLowerCase());

  if (queryTerms.length === 0) {
    return [];
  }

  const workflows = await prisma.workflowRun.findMany({
    where: {
      repositoryId: input.repositoryId,
      status: {
        in: ["MENTOR_DRAFT_READY", "WAITING_FOR_REVIEW", "REVIEWED"]
      }
    },
    include: {
      ticket: true,
      state: true,
      mentorReview: true
    },
    orderBy: {
      startedAt: "desc"
    },
    take: 40
  });

  return workflows
    .map((workflow) => {
      const state = workflow.state;
      const text = [
        workflow.ticket.title,
        workflow.ticket.description,
        JSON.stringify(state?.ticketAnalysis ?? {}),
        JSON.stringify(state?.codeContext ?? {}),
        JSON.stringify(state?.fixProposal ?? {})
      ]
        .join(" ")
        .toLowerCase();
      const matchedSignals = queryTerms.filter((term) => text.includes(term)).slice(0, 12);
      const score = matchedSignals.length / Math.max(6, queryTerms.length);
      const fixProposal = state?.fixProposal as { title?: string } | null;
      const ticketAnalysis = state?.ticketAnalysis as { summary?: string } | null;

      return {
        workflowRunId: workflow.id,
        ticketId: workflow.ticketId,
        title: workflow.ticket.title,
        score: Number(score.toFixed(4)),
        status: workflow.status,
        matchedSignals,
        summary: ticketAnalysis?.summary,
        fixTitle: fixProposal?.title,
        reviewedDecision: workflow.mentorReview?.decision
      };
    })
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
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
      chunkingVersion: CHUNKING_VERSION,
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

    const results = mergeResults(providerResults, input.maxResults).map(redactSearchResult);
    const dependencyGraph = buildDependencyGraph(results);
    const memoryMatches = await findTicketMemoryMatches(input);

    if (results.length === 0) {
      warnings.push("No relevant repository snippets were found.");
    }

    if (providerResults.length === 0) {
      throw new AppError(500, "Both vector search and keyword search are unavailable");
    }

    return {
      indexStatus,
      results,
      dependencyGraph,
      memoryMatches,
      warnings
    };
  }
};
