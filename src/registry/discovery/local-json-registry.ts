/**
 * Local file-backed skill catalog (JSON).
 */

import { readFile } from 'node:fs/promises';
import type { RegistryEntry } from '../../types/registry.js';
import type { GetSkillOptions, RegistryProvider, RegistrySearchOptions } from './registry-provider.js';
import { rankAndPaginate } from './search-skills.js';

/** Root shape of `catalog.registry.json` */
export interface LocalRegistryFile {
  schemaVersion: string;
  /** Optional registry display metadata */
  registry?: { name?: string; description?: string };
  entries: RegistryEntryJson[];
}

/** JSON-serializable entry (dates as ISO strings) */
export interface RegistryEntryJson {
  name: string;
  description: string;
  tags: string[];
  supportedClients: string[];
  source: { type: string; url: string; config?: Record<string, unknown> };
  versions: string[];
  latest: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  stats?: {
    downloads: number;
    weeklyDownloads: number;
    monthlyDownloads: number;
    stars?: number;
    forks?: number;
  };
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export function parseRegistryEntryJson(raw: RegistryEntryJson): RegistryEntry {
  return {
    name: raw.name,
    description: raw.description,
    tags: raw.tags ?? [],
    supportedClients: raw.supportedClients ?? [],
    source: raw.source,
    versions: raw.versions ?? [],
    latest: raw.latest,
    author: raw.author,
    license: raw.license,
    homepage: raw.homepage,
    repository: raw.repository,
    stats: raw.stats,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    metadata: raw.metadata,
  };
}

export class LocalJsonRegistry implements RegistryProvider {
  readonly id: string;
  private entries: RegistryEntry[] = [];
  private loaded = false;

  constructor(
    /** Absolute or cwd-relative path to JSON catalog */
    public readonly catalogPath: string
  ) {
    this.id = `local:${catalogPath}`;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    const buf = await readFile(this.catalogPath, 'utf-8');
    const doc = JSON.parse(buf) as LocalRegistryFile;
    if (!doc.entries || !Array.isArray(doc.entries)) {
      throw new Error(`Invalid catalog: ${this.catalogPath} (missing entries[])`);
    }
    this.entries = doc.entries.map(parseRegistryEntryJson);
    this.loaded = true;
  }

  async reload(): Promise<void> {
    this.loaded = false;
    await this.ensureLoaded();
  }

  async search(query: string, options?: RegistrySearchOptions) {
    await this.ensureLoaded();
    return rankAndPaginate(this.entries, query, options);
  }

  async getSkill(name: string, options?: GetSkillOptions): Promise<RegistryEntry | null> {
    await this.ensureLoaded();
    const key = name.toLowerCase();
    const hit = this.entries.find((e) => e.name.toLowerCase() === key);
    if (!hit) return null;
    if (options?.version && !hit.versions.includes(options.version)) {
      return null;
    }
    return hit;
  }
}
