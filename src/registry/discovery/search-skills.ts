/**
 * Local search algorithm: token overlap + field weights + tag / client filters.
 * Remote APIs can reuse the same scoring on the client after fetch, or implement server-side search.
 */

import type { RegistryEntry, RegistrySearchResult } from '../../types/registry.js';
import { DEFAULT_MODULE_TYPE, type AIModuleType } from '../../types/ai-module.js';
import type { RegistrySearchOptions } from './registry-provider.js';

const WEIGHT_NAME = 1;
const WEIGHT_TAG = 0.85;
const WEIGHT_DESCRIPTION = 0.55;
const WEIGHT_CLIENT = 0.35;

/** Split query into normalized tokens (letters, digits, underscore, hyphen). */
export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9_-]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function normalizeTag(t: string): string {
  return t.toLowerCase().replace(/^#/, '');
}

/**
 * Score a single entry against a token list. Returns 0..1 (relative; capped at 1).
 */
export function scoreEntryAgainstTokens(entry: RegistryEntry, tokens: string[]): number {
  if (tokens.length === 0) return 0;

  const name = entry.name.toLowerCase();
  const desc = entry.description.toLowerCase();
  const tagSet = entry.tags.map(normalizeTag);
  const clientSet = entry.supportedClients.map((c) => c.toLowerCase());

  let raw = 0;
  let maxPossible = 0;

  for (const tok of tokens) {
    maxPossible += WEIGHT_NAME + WEIGHT_TAG + WEIGHT_DESCRIPTION + WEIGHT_CLIENT;

    if (name.includes(tok) || name === tok) raw += WEIGHT_NAME;
    else if (name.split(/[-_/]/).some((p) => p === tok)) raw += WEIGHT_NAME * 0.9;

    if (tagSet.some((t) => t === tok || t.includes(tok))) raw += WEIGHT_TAG;

    if (desc.includes(tok)) raw += WEIGHT_DESCRIPTION;

    if (clientSet.some((c) => c.includes(tok))) raw += WEIGHT_CLIENT;
  }

  const normalized = raw / Math.max(maxPossible, 1);
  return Math.min(1, normalized * 1.2);
}

/**
 * Tags filter: every required tag must appear on the entry (AND).
 */
export function matchesAllTags(entry: RegistryEntry, required?: string[]): boolean {
  if (!required?.length) return true;
  const have = new Set(entry.tags.map(normalizeTag));
  return required.every((t) => have.has(normalizeTag(t)));
}

/**
 * Client filter: entry must support at least one requested client (OR).
 */
export function matchesAnyClient(entry: RegistryEntry, clients?: string[]): boolean {
  if (!clients?.length) return true;
  const supported = new Set(entry.supportedClients.map((c) => c.toLowerCase()));
  return clients.some((c) => supported.has(c.toLowerCase()));
}

/**
 * Filter by `metadata.moduleType` (missing metadata counts as {@link DEFAULT_MODULE_TYPE}).
 */
export function matchesModuleTypes(entry: RegistryEntry, types?: AIModuleType[]): boolean {
  if (!types?.length) return true;
  const t = (entry.metadata?.moduleType as AIModuleType | undefined) ?? DEFAULT_MODULE_TYPE;
  return types.includes(t);
}

/**
 * Rank entries into {@link RegistrySearchResult} with scores, sort, slice.
 */
export function rankAndPaginate(
  entries: RegistryEntry[],
  query: string,
  options?: RegistrySearchOptions
): RegistrySearchResult[] {
  const tokens = tokenizeQuery(query);
  const tags = options?.tags;
  const clients = options?.supportedClients;
  const moduleTypes = options?.moduleTypes;
  const sortBy = options?.sortBy ?? 'relevance';
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  let filtered = entries.filter(
    (e) => matchesAllTags(e, tags) && matchesAnyClient(e, clients) && matchesModuleTypes(e, moduleTypes)
  );

  const hits: RegistrySearchResult[] = filtered.map((entry) => {
    const score =
      tokens.length === 0 ? 0.15 : scoreEntryAgainstTokens(entry, tokens);
    return {
      name: entry.name,
      description: entry.description,
      version: entry.latest,
      tags: entry.tags,
      supportedClients: entry.supportedClients,
      score,
      downloads: entry.stats?.downloads,
      sourceType: entry.source.type,
      moduleType: (entry.metadata?.moduleType as AIModuleType | undefined) ?? DEFAULT_MODULE_TYPE,
    };
  });

  if (sortBy === 'relevance') {
    hits.sort((a, b) => b.score - a.score || (b.downloads ?? 0) - (a.downloads ?? 0));
  } else if (sortBy === 'downloads') {
    hits.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
  } else if (sortBy === 'updated') {
    const byUpdated = new Map(filtered.map((e) => [e.name, e.updatedAt.getTime()]));
    hits.sort((a, b) => (byUpdated.get(b.name) ?? 0) - (byUpdated.get(a.name) ?? 0));
  } else {
    hits.sort((a, b) => a.name.localeCompare(b.name));
  }

  return hits.slice(offset, offset + limit);
}
