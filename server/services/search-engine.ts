import type { Agent, Task } from "../../shared/schema";

interface SearchResult<T> {
  item: T;
  score: number;
  matches: string[];
}

interface SearchOptions {
  fields: string[];
  fuzzy: boolean;
  caseSensitive: boolean;
  minScore: number;
  limit: number;
}

const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  fields: [],
  fuzzy: true,
  caseSensitive: false,
  minScore: 0.3,
  limit: 20,
};

function normalizeText(text: string, caseSensitive: boolean): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  return caseSensitive ? normalized : normalized.toLowerCase();
}

function getFieldValue(obj: Record<string, unknown>, field: string): string {
  const parts = field.split(".");
  let value: unknown = obj;

  for (const part of parts) {
    if (value === null || value === undefined) return "";
    value = (value as Record<string, unknown>)[part];
  }

  return value === null || value === undefined ? "" : String(value);
}

function exactScore(text: string, query: string): number {
  if (text === query) return 1.0;
  if (text.startsWith(query)) return 0.9;
  if (text.includes(query)) return 0.7;
  return 0;
}

function fuzzyScore(text: string, query: string): number {
  if (query.length === 0) return 0;
  if (text === query) return 1.0;

  let matches = 0;
  let lastIndex = -1;
  let score = 0;
  let consecutiveBonus = 0;

  for (const char of query) {
    const idx = text.indexOf(char, lastIndex + 1);
    if (idx === -1) return 0;

    matches++;

    if (idx === lastIndex + 1) {
      consecutiveBonus += 0.1;
    } else {
      consecutiveBonus = 0;
    }

    score += (1 / (idx + 1)) * 0.1 + consecutiveBonus;
    lastIndex = idx;
  }

  const completeness = matches / query.length;
  const coverage = matches / text.length;

  return Math.min(1, completeness * 0.6 + coverage * 0.2 + score * 0.2);
}

function computeFieldScore(
  obj: Record<string, unknown>,
  field: string,
  query: string,
  options: SearchOptions
): { score: number; matched: boolean } {
  const raw = getFieldValue(obj, field);
  if (!raw) return { score: 0, matched: false };

  const text = normalizeText(raw, options.caseSensitive);
  const normalizedQuery = normalizeText(query, options.caseSensitive);

  const exact = exactScore(text, normalizedQuery);
  if (exact > 0) return { score: exact, matched: true };

  if (options.fuzzy) {
    const fuzz = fuzzyScore(text, normalizedQuery);
    return { score: fuzz, matched: fuzz > 0 };
  }

  return { score: 0, matched: false };
}

export function searchItems<T extends Record<string, unknown>>(
  items: T[],
  query: string,
  options: Partial<SearchOptions> = {}
): SearchResult<T>[] {
  const config = { ...DEFAULT_SEARCH_OPTIONS, ...options };

  if (!query.trim()) return items.map((item) => ({ item, score: 1, matches: [] }));

  const results: SearchResult<T>[] = [];

  for (const item of items) {
    const fieldScores: Array<{ field: string; score: number }> = [];
    const matchedFields: string[] = [];

    for (const field of config.fields) {
      const { score, matched } = computeFieldScore(item, field, query, config);
      if (matched) {
        fieldScores.push({ field, score });
        matchedFields.push(field);
      }
    }

    if (fieldScores.length === 0) continue;

    const totalScore = fieldScores.reduce((sum, f) => sum + f.score, 0) / config.fields.length;

    if (totalScore >= config.minScore) {
      results.push({ item, score: Math.round(totalScore * 1000) / 1000, matches: matchedFields });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, config.limit);
}

export function searchAgents(
  agents: Agent[],
  query: string
): SearchResult<Agent>[] {
  return searchItems(agents as unknown as Record<string, unknown>[], query, {
    fields: ["name", "role", "status", "description"],
    fuzzy: true,
    minScore: 0.2,
    limit: 30,
  }) as unknown as SearchResult<Agent>[];
}

export function searchTasks(tasks: Task[], query: string): SearchResult<Task>[] {
  return searchItems(tasks as unknown as Record<string, unknown>[], query, {
    fields: ["title", "description", "status", "priority", "category"],
    fuzzy: true,
    minScore: 0.2,
    limit: 50,
  }) as unknown as SearchResult<Task>[];
}

export function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return text;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  return text.replace(regex, "**$1**");
}
