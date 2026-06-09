const secretPatterns: Array<{ pattern: RegExp; replacement: string }> = [
  {
    pattern:
      /\b((?:api[_-]?key|access[_-]?token|refresh[_-]?token|auth[_-]?token|secret|password|passwd|pwd|client[_-]?secret|private[_-]?key)\s*[:=]\s*)(["']?)[^"',\s;&]+(\2)/gi,
    replacement: "$1$2[REDACTED]$3"
  },
  {
    pattern: /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi,
    replacement: "$1[REDACTED]"
  },
  {
    pattern: /\b([A-Za-z0-9_-]+\.){2}[A-Za-z0-9_-]{8,}\b/g,
    replacement: "[REDACTED_JWT]"
  },
  {
    pattern: /\b(?:postgres(?:ql)?|mysql|mongodb|redis):\/\/[^\s"'<>]+/gi,
    replacement: "[REDACTED_CONNECTION_STRING]"
  },
  {
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    replacement: "[REDACTED_PRIVATE_KEY]"
  }
];

const sensitiveKeyPattern =
  /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|auth[_-]?token|secret|password|passwd|pwd|client[_-]?secret|private[_-]?key|cookie|authorization)/i;

export function redactText(value: string) {
  return secretPatterns.reduce((text, rule) => text.replace(rule.pattern, rule.replacement), value);
}

export function redactPayload<T>(value: T): T {
  if (typeof value === "string") {
    return redactText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactPayload(item)) as T;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[REDACTED]" : redactPayload(item)
    ])
  ) as T;
}
