/**
 * Default composite registry: ordered backends, merged search, first-hit getSkill.
 * Suitable for `local + remote`, `remote + failover`, or multiple enterprise mirrors.
 */

import type { RegistryEntry, RegistrySearchResult } from '../../types/registry.js';
import type { GetSkillOptions, RegistryProvider, RegistrySearchOptions } from './registry-provider.js';

function mergeSearchResults(rows: RegistrySearchResult[]): RegistrySearchResult[] {
  const byName = new Map<string, RegistrySearchResult>();
  for (const r of rows) {
    const key = r.name.toLowerCase();
    const prev = byName.get(key);
    if (!prev || r.score > prev.score) byName.set(key, r);
  }
  return [...byName.values()].sort((a, b) => b.score - a.score || (b.downloads ?? 0) - (a.downloads ?? 0));
}

export class DefaultRegistry implements RegistryProvider {
  readonly id: string;

  constructor(
    /** First provider wins for duplicate names in getSkill */
    private readonly backends: RegistryProvider[]
  ) {
    if (!backends.length) throw new Error('DefaultRegistry requires at least one backend');
    this.id = `default:${backends.map((b) => b.id).join('+')}`;
  }

  async search(query: string, options?: RegistrySearchOptions): Promise<RegistrySearchResult[]> {
    const limit = options?.limit ?? 50;
    const merged: RegistrySearchResult[] = [];
    for (const b of this.backends) {
      try {
        const chunk = await b.search(query, { ...options, limit: limit * 2, offset: 0 });
        merged.push(...chunk);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[aistack] Catalog source skipped (${b.id}): ${msg.split('\n')[0]}`);
      }
    }
    const deduped = mergeSearchResults(merged);
    const offset = options?.offset ?? 0;
    return deduped.slice(offset, offset + limit);
  }

  async getSkill(name: string, options?: GetSkillOptions): Promise<RegistryEntry | null> {
    for (const b of this.backends) {
      try {
        const skill = await b.getSkill(name, options);
        if (skill) return skill;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[aistack] Catalog source skipped (${b.id}) during lookup: ${msg.split('\n')[0]}`);
      }
    }
    return null;
  }
}
