import { createHash } from "node:crypto";
import { env } from "../config/env.js";

export interface EmbeddingClient {
  model: string;
  isFallback: boolean;
  dimensions: number;
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

function normalizeVector(values: number[]) {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
  return values.map((value) => Number((value / magnitude).toFixed(8)));
}

function hashEmbedding(text: string, dimensions = 64) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9_.$-]+/)
    .filter((token) => token.length > 1);

  for (const token of tokens.length > 0 ? tokens : [text.toLowerCase()]) {
    const hash = createHash("sha256").update(token).digest();

    for (let index = 0; index < hash.length; index += 2) {
      const slot = hash[index] % dimensions;
      const sign = hash[index + 1] % 2 === 0 ? 1 : -1;
      vector[slot] += sign * (1 + token.length / 20);
    }
  }

  return normalizeVector(vector);
}

function parseExtraHeaders() {
  try {
    const parsed = JSON.parse(env.AI_EXTRA_HEADERS || "{}") as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

class LocalHashEmbeddingClient implements EmbeddingClient {
  model = env.EMBEDDING_MODEL || "text-embedding-3-small";
  isFallback = true;
  dimensions = 64;

  async embedDocuments(texts: string[]) {
    return texts.map((text) => hashEmbedding(text, this.dimensions));
  }

  async embedQuery(text: string) {
    return hashEmbedding(text, this.dimensions);
  }
}

class OpenAiCompatibleEmbeddingClient implements EmbeddingClient {
  model = env.EMBEDDING_MODEL;
  isFallback = false;
  dimensions = 0;

  private async embed(texts: string[]) {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const response = await fetch(`${env.AI_BASE_URL.replace(/\/+$/, "")}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        ...parseExtraHeaders()
      },
      body: JSON.stringify({
        model: this.model,
        input: texts
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding provider failed with HTTP ${response.status}`);
    }

    const body = (await response.json()) as {
      data?: { embedding?: number[] }[];
    };
    const embeddings = body.data?.map((item) => item.embedding).filter(Boolean) as
      | number[][]
      | undefined;

    if (!embeddings || embeddings.length !== texts.length) {
      throw new Error("Embedding provider returned an invalid response");
    }

    this.dimensions = embeddings[0]?.length ?? 0;
    return embeddings;
  }

  async embedDocuments(texts: string[]) {
    return this.embed(texts);
  }

  async embedQuery(text: string) {
    const [embedding] = await this.embed([text]);
    return embedding;
  }
}

export function createEmbeddingClient(): EmbeddingClient {
  if (!env.OPENAI_API_KEY) {
    return new LocalHashEmbeddingClient();
  }

  return new OpenAiCompatibleEmbeddingClient();
}

export function toPgVectorLiteral(embedding: number[]) {
  return `[${embedding.map((value) => Number(value.toFixed(8))).join(",")}]`;
}
