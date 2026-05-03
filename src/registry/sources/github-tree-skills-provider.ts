/**
 * Discovers skills by listing a GitHub repo directory (e.g. `skills/`).
 * Folder entries → GitHub tarball subpath; top-level `.md` files → prompt-style skills.
 * Results are cached on disk (TTL) to avoid hammering the API.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import type { RegistryEntry } from '../../types/registry.js';
import type { GetSkillOptions, RegistryProvider, RegistrySearchOptions } from '../discovery/registry-provider.js';
import { rankAndPaginate } from '../discovery/search-skills.js';
import type { RegistryEntryJson } from '../discovery/local-json-registry.js';
import { parseRegistryEntryJson } from '../discovery/local-json-registry.js';
import type { AIModuleType } from '../../types/ai-module.js';
import { DEFAULT_MODULE_TYPE } from '../../types/ai-module.js';
import { fetchRawText } from './raw-github.js';
import { DEFAULT_RELATIVE_CACHE_DIR } from '../../branding.js';

const GITHUB_API = 'https://api.github.com';

let warnedMissingGithubToken = false;

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  let ix = 0;
  const n = Math.max(1, Math.min(concurrency, 32));
  async function runWorker() {
    while (true) {
      const i = ix++;
      if (i >= items.length) return;
      await worker(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, () => runWorker()));
}

export interface GitHubTreeSkillsProviderOptions {
  /** Short id for namespaced skill names, e.g. `awesome-copilot` */
  catalogId: string;
  owner: string;
  repo: string;
  /** Path relative to repo root, e.g. `skills` */
  skillsPath: string;
  branch: string;
  token?: string;
  fetchImpl?: typeof fetch;
  cacheTtlSeconds: number;
  /** Absolute path to JSON cache file */
  cacheFilePath: string;
  /** When true, enrich folder skills from raw `skill.json` / `SKILL.md` (bounded). */
  enrichDescriptions?: boolean;
  /** Max raw fetches per catalog refresh (0 = skip enrichment). */
  metadataEnrichMax?: number;
  /** Parallel raw fetches. */
  metadataEnrichConcurrency?: number;
  /** Catalog row kind: skills vs subagents vs hooks (manifest hints for enrichment). */
  moduleType: AIModuleType;
}

interface GhContentRow {
  name: string;
  path: string;
  type: 'file' | 'dir';
}

async function githubJson<T>(
  url: string,
  token: string | undefined,
  fetchImpl: typeof fetch
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetchImpl(url, { headers });
  if (res.status === 403 && !token && !warnedMissingGithubToken) {
    warnedMissingGithubToken = true;
    process.emitWarning(
      'GitHub API returned 403 for skill catalog listing. Set GITHUB_TOKEN for higher rate limits and private repo access.',
      { code: 'AISTACK_GITHUB_TOKEN', detail: url }
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status} ${url}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

function registryName(catalogId: string, skillKey: string): string {
  const safeCat = catalogId.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'catalog';
  const safeKey = skillKey.replace(/[^a-z0-9_.-]+/gi, '-').replace(/^-+|-+$/g, '') || 'skill';
  return `${safeCat}--${safeKey}`;
}

function dirManifestPaths(rel: string, moduleType: AIModuleType): string[] {
  switch (moduleType) {
    case 'subagent':
      return [`${rel}/agent.json`, `${rel}/AGENT.md`, `${rel}/system.md`, `${rel}/SKILL.md`, `${rel}/skill.json`];
    case 'hook':
      return [`${rel}/hook.json`, `${rel}/hook.yaml`, `${rel}/hook.md`];
    default:
      return [`${rel}/skill.json`, `${rel}/SKILL.md`, `${rel}/skill.md`];
  }
}

function skillRepoPath(skillsPath: string, skillKey: string): string {
  const root = skillsPath.replace(/^\/+|\/+$/g, '');
  return root ? `${root}/${skillKey}` : skillKey;
}

function summarizeMd(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const nonempty = lines.filter((l) => l.length > 0);
  for (const line of nonempty) {
    if (line.startsWith('---')) continue;
    const stripped = line.replace(/^#+\s*/, '').trim();
    if (stripped.length > 8) return stripped.slice(0, 500);
  }
  return nonempty.slice(0, 3).join(' ').slice(0, 400);
}

async function enrichGithubEntries(
  entries: RegistryEntry[],
  owner: string,
  repo: string,
  branch: string,
  fetchImpl: typeof fetch,
  options: { enabled: boolean; max: number; concurrency: number }
): Promise<RegistryEntry[]> {
  if (!options.enabled || options.max <= 0) return entries;

  type Task = { index: number; tryPaths: string[] };
  const tasks: Task[] = [];
  entries.forEach((e, index) => {
    const kind = e.metadata?.kind;
    const rel = e.metadata?.skillPath as string | undefined;
    if (!rel) return;
    const moduleType = (e.metadata?.moduleType as AIModuleType) ?? DEFAULT_MODULE_TYPE;
    if (kind === 'github-tree-dir') {
      tasks.push({ index, tryPaths: dirManifestPaths(rel, moduleType) });
    } else if (kind === 'github-tree-md') {
      tasks.push({ index, tryPaths: [rel] });
    }
  });
  tasks.sort((a, b) => a.tryPaths[0].localeCompare(b.tryPaths[0]));
  const slice = tasks.slice(0, options.max);

  const next = entries.map((e) => ({ ...e, tags: [...e.tags] }));

  await runPool(slice, options.concurrency, async (task) => {
    let desc = '';
    const extraTags: string[] = [];
    for (const p of task.tryPaths) {
      const text = await fetchRawText(owner, repo, branch, p, fetchImpl);
      if (!text) continue;
      if (p.endsWith('.json')) {
        try {
          const j = JSON.parse(text) as { description?: string; tags?: unknown };
          if (typeof j.description === 'string' && j.description.trim()) {
            desc = j.description.trim().slice(0, 500);
          }
          if (Array.isArray(j.tags)) {
            for (const t of j.tags) {
              if (typeof t === 'string' && extraTags.length < 16) extraTags.push(t);
            }
          }
          if (desc) break;
        } catch {
          /* invalid json */
        }
      } else {
        const s = summarizeMd(text);
        if (s) {
          desc = s;
          break;
        }
      }
    }
    if (!desc && extraTags.length === 0) return;
    const cur = next[task.index]!;
    const tagSet = new Set([...cur.tags, ...extraTags]);
    next[task.index] = {
      ...cur,
      description: desc || cur.description,
      tags: [...tagSet],
    };
  });

  return next;
}

interface CacheDoc {
  fetchedAt: string;
  ttlSeconds: number;
  entries: RegistryEntryJson[];
}

export class GitHubTreeSkillsProvider implements RegistryProvider {
  readonly id: string;
  private entries: RegistryEntry[] = [];
  private loaded = false;
  private readonly opts: GitHubTreeSkillsProviderOptions;

  constructor(opts: GitHubTreeSkillsProviderOptions) {
    this.opts = opts;
    this.id = `github-tree:${opts.catalogId}`;
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
    const { owner, repo, skillsPath, branch, catalogId, token, fetchImpl: optFetch } = this.opts;
    const httpFetch = optFetch ?? fetch;
    const encPath = skillsPath
      .split('/')
      .map((s) => encodeURIComponent(s))
      .join('/');
    const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encPath}?ref=${encodeURIComponent(branch)}`;
    const rows = await githubJson<GhContentRow[] | { message?: string }>(url, token, httpFetch);
    if (!Array.isArray(rows)) {
      throw new Error(`GitHub contents not a directory for ${owner}/${repo}/${skillsPath}: ${JSON.stringify(rows).slice(0, 120)}`);
    }

    const now = new Date();
    const repoUrl = `https://github.com/${owner}/${repo}`;
    const out: RegistryEntry[] = [];
    const moduleType = this.opts.moduleType;

    for (const row of rows) {
      if (row.type === 'dir') {
        const skillKey = row.name;
        if (skillKey.startsWith('.')) continue;
        const regName = registryName(catalogId, skillKey);
        const relPath = skillRepoPath(skillsPath, skillKey);
        out.push({
          name: regName,
          description: `Skill folder \`${skillKey}\` from ${owner}/${repo} (${catalogId})`,
          tags: ['github', catalogId, skillKey],
          supportedClients: ['cursor', 'copilot', 'claude'],
          source: {
            type: 'github',
            url: repoUrl,
            config: {
              owner,
              repo,
              path: relPath,
              branch,
              catalogId,
              skillFolder: skillKey,
              discoveryKind: 'github-tree-dir',
              moduleType,
            },
          },
          versions: [branch],
          latest: branch,
          repository: repoUrl,
          createdAt: now,
          updatedAt: now,
          metadata: {
            catalogId,
            skillFolder: skillKey,
            skillPath: relPath,
            kind: 'github-tree-dir',
            moduleType,
          },
        });
        continue;
      }

      if (row.type === 'file' && row.name.toLowerCase().endsWith('.md')) {
        const base = row.name.replace(/\.md$/i, '');
        if (base.toLowerCase() === 'readme') continue;
        const regName = registryName(catalogId, base);
        const relPath = row.path.replace(/^\/+|\/+$/g, '');
        out.push({
          name: regName,
          description: `Markdown skill \`${row.name}\` from ${owner}/${repo} (${catalogId})`,
          tags: ['github', catalogId, 'markdown-skill', base],
          supportedClients: ['cursor', 'copilot', 'claude'],
          source: {
            type: 'github',
            url: repoUrl,
            config: {
              owner,
              repo,
              path: relPath,
              branch,
              catalogId,
              skillFolder: base,
              discoveryKind: 'github-tree-md',
              moduleType,
            },
          },
          versions: [branch],
          latest: branch,
          repository: repoUrl,
          createdAt: now,
          updatedAt: now,
          metadata: {
            catalogId,
            skillFolder: base,
            skillPath: relPath,
            kind: 'github-tree-md',
            moduleType,
          },
        });
      }
    }

    const enrichOn = this.opts.enrichDescriptions !== false;
    const maxEnrich = this.opts.metadataEnrichMax ?? 120;
    const conc = this.opts.metadataEnrichConcurrency ?? 8;
    return enrichGithubEntries(out, owner, repo, branch, httpFetch, {
      enabled: enrichOn,
      max: maxEnrich,
      concurrency: conc,
    });
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
      this.entries.find((e) => {
        const folder = (e.metadata?.skillFolder as string | undefined)?.toLowerCase();
        return folder === key;
      }) ||
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

export function catalogCacheFilePath(
  cwd: string,
  cacheDir: string | undefined,
  owner: string,
  repo: string,
  skillsPath: string,
  branch: string
): string {
  const root = cacheDir?.trim() || DEFAULT_RELATIVE_CACHE_DIR;
  const h = createHash('sha256')
    .update(`${owner}\0${repo}\0${skillsPath}\0${branch}`)
    .digest('hex')
    .slice(0, 24);
  return path.join(cwd, root, 'github-catalog', `${owner}-${repo}-${h}.json`);
}
