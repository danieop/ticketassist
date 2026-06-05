import { env } from "../config/env.js";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

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

function extractJsonObject(content: string) {
  const trimmed = content.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return JSON.parse(trimmed) as unknown;
  }

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);

  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim()) as unknown;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
  }

  throw new Error("LLM response did not contain a JSON object");
}

export async function callJsonChat(input: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  timeoutMs?: number;
}) {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeoutMs = input.timeoutMs ?? 180000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;

  try {
    response = await fetch(`${env.AI_BASE_URL.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        ...parseExtraHeaders()
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature ?? 0.1,
        response_format: { type: "json_object" }
      })
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`LLM provider timed out after ${Math.round(timeoutMs / 1000)} seconds`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`LLM provider failed with HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`);
  }

  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = body.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("LLM provider returned an empty response");
  }

  return extractJsonObject(content);
}
