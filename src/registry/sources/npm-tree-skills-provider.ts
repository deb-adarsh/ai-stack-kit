/**
 * Discovers skills by listing a directory inside an npm package tarball (e.g. `skills/`).
 * Cached like {@link GitHubTreeSkillsProvider}.
 */

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import * as tar from 'tar';
import semver from 'semver';
import type { RegistryEntry } from '../../types/registry.js';
import type { GetSkillOptions, RegistryProvider, RegistrySearchOptions } from '../discovery/registry-provider.js';
import { rankAndPaginate } from '../discovery/search-skills.js';
import type { RegistryEntryJson } from '../discovery/local-json-registry.js';
import { parseRegistryEntryJson } from '../discovery/local-json-registry.js';
import type { AIModuleType } from '../../types/ai-module.js';
import { DEFAULT_MODULE_TYPE } from '../../types/ai-module.js';
import { DEFAULT_RELATIVE_CACHE_DIR } from '../../branding.js';

interface NpmPackageDoc {
  name: string;
  description?: string;
  'dist-tags'?: Record<string, string>;
  versions: Record<string, { dist?: { tarball?: string; shasum?: string } }>;
}

export interface NpmTreeSkillsProviderOptions {
  catalogId: string;
  /** Full npm package name including scope when needed */
  packageName: string;
  registryUrl: string;
  /** Resolved semver version */
  resolvedVersion: string;
  tarballUrl: string;
  skillsPath: string;
  cacheTtlSeconds: number;
  cacheFilePath: string;
  fetchImpl?: typeof fetch;
  moduleType: AIModuleType;
}

interface CacheDoc {
  fetchedAt: string;
  ttlSeconds: number;
  entries: RegistryEntryJson[];
}

function registryName(catalogId: string, skillKey: string): string {
  const safeCat = catalogId.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'catalog';
  const safeKey = skillKey.replace(/[^a-z0-9_.-]+/gi, '-').replace(/^-+|-+$/g, '') || 'skill';
  return `${safeCat}--${safeKey}`;
}

export class NpmTreeSkillsProvider implements RegistryProvider {
  readonly id: string;
  private entries: RegistryEntry[] = [];
  private loaded = false;

  constructor(private readonly opts: NpmTreeSkillsProviderOptions) {
    this.id = `npm-tree:${opts.catalogId}`;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    const { cacheFilePath, cacheTtlSeconds } = this.opts;
    try {
      const buf = await readFile(cacheFilePath, 'utf-8');
      const doc = JSON.parse(buf) as CacheDoc;
      const age = Date.now() - new Date(doc.fetchedAt).getTime();
      if (age >= 0 && age < (doc.ttlSeconds ?? cacheTtlSeconds) * 1000 && Array.isArray(doc.entries)) {
        this.entries = doc.entries.map(parseRegistryEntryJson);
        this.loaded = true;
        return;
      }
    } catch {
      /* refresh */
    }

    this.entries = await this.fetchFreshEntries();
    this.loaded = true;

    await mkdir(path.dirname(cacheFilePath), { recursive: true });
    const payload: CacheDoc = {
      fetchedAt: new Date().toISOString(),
      ttlSeconds: cacheTtlSeconds,
      entries: this.entries.map(serializeEntry),
    };
    await writeFile(cacheFilePath, JSON.stringify(payload, null, 0), 'utf-8');
  }

  private async fetchFreshEntries(): Promise<RegistryEntry[]> {
    const { packageName, registryUrl, resolvedVersion, tarballUrl, skillsPath, catalogId, fetchImpl, moduleType } =
      this.opts;
    const f = fetchImpl ?? fetch;
    const res = await f(tarballUrl, { headers: { Accept: 'application/octet-stream' } });
    if (!res.ok) throw new Error(`npm tarball ${res.status} for ${packageName}`);

    const tmp = await import('node:fs/promises').then((fs) => fs.mkdtemp(path.join(tmpdir(), 'se-npm-tree-')));
    const tarPath = path.join(tmp, 'pkg.tgz');
    await writeFile(tarPath, Buffer.from(await res.arrayBuffer()));

    const extractDir = path.join(tmp, 'out');
    await mkdir(extractDir, { recursive: true });
    await tar.x({ file: tarPath, cwd: extractDir });

    const top = await readdir(extractDir, { withFileTypes: true });
    const pkgDir = top.find((e) => e.isDirectory() && e.name === 'package');
    const root = pkgDir ? path.join(extractDir, 'package') : extractDir;
    const skillsRoot = path.join(root, skillsPath.replace(/^\/+|\/+$/g, ''));

    const now = new Date();
    const npmUrl = `${registryUrl.replace(/\/$/, '')}/${encodeURIComponent(packageName).replace(/%40/g, '@')}`;
    const out: RegistryEntry[] = [];

    let rows;
    try {
      rows = await readdir(skillsRoot, { withFileTypes: true });
    } catch {
      await rm(tmp, { recursive: true, force: true });
      throw new Error(`Path "${skillsPath}" not found inside ${packageName}@${resolvedVersion}`);
    }

    for (const ent of rows) {
      if (ent.name.startsWith('.')) continue;
      if (ent.isDirectory()) {
        const skillKey = ent.name;
        const relPath = `${skillsPath.replace(/^\/+|\/+$/g, '')}/${skillKey}`;
        const regName = registryName(catalogId, skillKey);
        out.push({
          name: regName,
          description: `Skill folder \`${skillKey}\` from npm package ${packageName}@${resolvedVersion}`,
          tags: ['npm', catalogId, skillKey],
          supportedClients: ['cursor', 'copilot', 'claude'],
          source: {
            type: 'npm',
            url: `https://www.npmjs.com/package/${encodeURIComponent(packageName)}`,
            config: {
              package: packageName,
              path: relPath,
              version: resolvedVersion,
              registry: registryUrl,
              catalogId,
              discoveryKind: 'npm-tree-dir',
              moduleType,
            },
          },
          versions: [resolvedVersion],
          latest: resolvedVersion,
          repository: npmUrl,
          createdAt: now,
          updatedAt: now,
          metadata: {
            catalogId,
            skillFolder: skillKey,
            skillPath: relPath,
            kind: 'npm-tree-dir',
            moduleType,
          },
        });
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) {
        const base = ent.name.replace(/\.md$/i, '');
        if (base.toLowerCase() === 'readme') continue;
        const relPath = `${skillsPath.replace(/^\/+|\/+$/g, '')}/${ent.name}`;
        const regName = registryName(catalogId, base);
        out.push({
          name: regName,
          description: `Markdown skill \`${ent.name}\` from npm package ${packageName}@${resolvedVersion}`,
          tags: ['npm', catalogId, 'markdown-skill', base],
          supportedClients: ['cursor', 'copilot', 'claude'],
          source: {
            type: 'npm',
            url: `https://www.npmjs.com/package/${encodeURIComponent(packageName)}`,
            config: {
              package: packageName,
              path: relPath,
              version: resolvedVersion,
              registry: registryUrl,
              catalogId,
              discoveryKind: 'npm-tree-md',
              moduleType,
            },
          },
          versions: [resolvedVersion],
          latest: resolvedVersion,
          repository: npmUrl,
          createdAt: now,
          updatedAt: now,
          metadata: {
            catalogId,
            skillFolder: base,
            skillPath: relPath,
            kind: 'npm-tree-md',
            moduleType,
          },
        });
      }
    }

    await rm(tmp, { recursive: true, force: true });
    return out;
  }

  async search(query: string, options?: RegistrySearchOptions) {
    await this.ensureLoaded();
    return rankAndPaginate(this.entries, query, options);
  }

  async getSkill(name: string, options?: GetSkillOptions): Promise<RegistryEntry | null> {
    await this.ensureLoaded();
    const key = name.trim().toLowerCase();
    const hit =
      this.entries.find((e) => e.name.toLowerCase() === key) ||
      this.entries.find((e) => (e.metadata?.skillFolder as string | undefined)?.toLowerCase() === key) ||
      this.entries.find((e) => e.name.toLowerCase().endsWith(`--${key}`));
    if (!hit) return null;
    if (options?.version && !hit.versions.includes(options.version)) {
      return null;
    }
    return hit;
  }
}

function serializeEntry(e: RegistryEntry): RegistryEntryJson {
  return {
    name: e.name,
    description: e.description,
    tags: e.tags,
    supportedClients: e.supportedClients,
    source: e.source,
    versions: e.versions,
    latest: e.latest,
    author: e.author,
    license: e.license,
    homepage: e.homepage,
    repository: e.repository,
    stats: e.stats,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    metadata: e.metadata,
  };
}

export async function resolveNpmPackageForTree(
  packageName: string,
  registryUrl: string,
  versionSpec: string | undefined,
  fetchImpl: typeof fetch
): Promise<{ resolvedVersion: string; tarballUrl: string }> {
  const reg = registryUrl.replace(/\/$/, '');
  const encoded = encodeURIComponent(packageName).replace(/%40/g, '@');
  const url = `${reg}/${encoded}`;
  const res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`npm registry ${res.status} for ${packageName}`);
  const doc = (await res.json()) as NpmPackageDoc;

  const range = versionSpec?.trim() || doc['dist-tags']?.latest;
  if (!range) throw new Error(`No version for ${packageName}`);

  let version: string;
  if (semver.valid(range)) {
    version = range;
  } else if (doc['dist-tags']?.[range]) {
    version = doc['dist-tags'][range]!;
  } else {
    const versions = Object.keys(doc.versions);
    const resolved = semver.maxSatisfying(versions, range, true);
    if (!resolved) throw new Error(`No npm version satisfies ${range} for ${packageName}`);
    version = resolved;
  }

  const tarball = doc.versions[version]?.dist?.tarball;
  if (!tarball) throw new Error(`No tarball for ${packageName}@${version}`);
  return { resolvedVersion: version, tarballUrl: tarball };
}

export function npmCatalogCacheFilePath(
  cwd: string,
  cacheDir: string | undefined,
  packageName: string,
  resolvedVersion: string,
  skillsPath: string
): string {
  const root = cacheDir?.trim() || DEFAULT_RELATIVE_CACHE_DIR;
  const h = createHash('sha256')
    .update(`${packageName}\0${resolvedVersion}\0${skillsPath}`)
    .digest('hex')
    .slice(0, 24);
  const safe = packageName.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 40);
  return path.join(cwd, root, 'npm-catalog', `${safe}-${h}.json`);
}
