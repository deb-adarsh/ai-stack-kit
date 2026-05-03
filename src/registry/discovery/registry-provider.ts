/**
 * Skill discovery registry — local JSON catalogs, remote HTTP APIs, and composites.
 * (Npm-style publish/tarball flows live in `../base/registry-provider.js` as `NpmRegistryProvider`.)
 */

import type { AIModuleType } from '../../types/ai-module.js';
import type { RegistryEntry, RegistrySearchResult } from '../../types/registry.js';

/** Options for {@link RegistryProvider.search} */
export interface RegistrySearchOptions {
  /** Skill must include every listed tag (AND). Omit for no tag filter. */
  tags?: string[];
  /** Restrict to skills that declare support for at least one of these clients */
  supportedClients?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'downloads' | 'updated' | 'name';
  /** When set, only entries whose `metadata.moduleType` matches (default-untyped counts as `skill`). */
  moduleTypes?: AIModuleType[];
}

/** Options for {@link RegistryProvider.getSkill} */
export interface GetSkillOptions {
  /** Pin a specific semver; default uses catalog `latest` */
  version?: string;
}

/**
 * Pluggable registry for discovering skills.
 * Enterprise / private catalogs: implement this interface (often wrapping {@link RemoteApiRegistry} with auth).
 */
export interface RegistryProvider {
  /** Stable id (e.g. file path, hostname, config key) */
  readonly id: string;

  /**
   * Search the catalog. Empty `query` returns all entries (still subject to filters, limit, offset).
   */
  search(query: string, options?: RegistrySearchOptions): Promise<RegistrySearchResult[]>;

  /**
   * Full metadata for one skill by canonical name (case-insensitive match on `name`).
   */
  getSkill(name: string, options?: GetSkillOptions): Promise<RegistryEntry | null>;
}
