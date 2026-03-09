const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#96;",
};

const ENTITY_PATTERN = /[&<>"'`/]/g;

export function escapeHtml(input: string): string {
  return input.replace(ENTITY_PATTERN, (char) => HTML_ENTITIES[char] || char);
}

export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

export function sanitizeString(input: string): string {
  return stripHtml(input)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}

export function sanitizeIdentifier(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 64);
}

export function sanitizeEmail(input: string): string {
  return input.toLowerCase().trim().substring(0, 254);
}

export function sanitizeUrl(input: string): string {
  const trimmed = input.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//")
  ) {
    return trimmed;
  }
  return "";
}

export function sanitizeWalletAddress(input: string): string {
  const trimmed = input.trim();
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
    return trimmed;
  }
  return "";
}

export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  rules?: Partial<Record<keyof T, "string" | "identifier" | "email" | "url" | "wallet" | "none">>
): T {
  const result = { ...obj };

  for (const [key, value] of Object.entries(result)) {
    if (typeof value !== "string") continue;

    const rule = rules?.[key as keyof T] || "string";

    switch (rule) {
      case "identifier":
        (result as Record<string, unknown>)[key] = sanitizeIdentifier(value);
        break;
      case "email":
        (result as Record<string, unknown>)[key] = sanitizeEmail(value);
        break;
      case "url":
        (result as Record<string, unknown>)[key] = sanitizeUrl(value);
        break;
      case "wallet":
        (result as Record<string, unknown>)[key] = sanitizeWalletAddress(value);
        break;
      case "none":
        break;
      default:
        (result as Record<string, unknown>)[key] = sanitizeString(value);
    }
  }

  return result;
}

export function truncate(input: string, maxLength: number, suffix: string = "..."): string {
  if (input.length <= maxLength) return input;
  return input.substring(0, maxLength - suffix.length) + suffix;
}

export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}
