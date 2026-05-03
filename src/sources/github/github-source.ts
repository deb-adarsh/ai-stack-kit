/**
 * GitHub skill source: resolve via GitHub API, fetch repo archive tarball, parse skill metadata.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import * as tar from 'tar';
import semver from 'semver';
import type { SkillManifest, SkillMetadata, SkillReference } from '../../types/skill.js';
import type { InstallContext, SkillFiles, SkillInstallResult, SkillSource } from '../base/skill-source.js';

const GITHUB_API = 'https://api.github.com';

export interface GitHubSourceOptions {
  /** Defaults to process.env.GITHUB_TOKEN */
  token?: string;
  fetchImpl?: typeof fetch;
}

function tarballUrl(owner: string, repo: string, ref: string): string {
  return `https://codeload.github.com/${owner}/${repo}/tar.gz/${encodeURIComponent(ref)}`;
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status} ${url}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

interface RepoMeta {
  default_branch: string;
}

interface TagRef {
  ref: string;
}

export class GitHubSource implements SkillSource {
  readonly type = 'github' as const;
  private readonly token: string | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: GitHubSourceOptions = {}) {
    this.token = options.token ?? process.env.GITHUB_TOKEN;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  canHandle(ref: SkillReference): boolean {
    return ref.source === 'github';
  }

  async resolve(ref: SkillReference): Promise<SkillMetadata> {
    const owner = ref.sourceConfig?.owner;
    const repo = ref.sourceConfig?.repo;
    if (!owner || !repo) {
      throw new Error('GitHub skill requires sourceConfig.owner and sourceConfig.repo');
    }

    const subPath = ref.sourceConfig?.path ?? '';
    const repoMeta = await githubJson<RepoMeta>(
      `${GITHUB_API}/repos/${owner}/${repo}`,
      this.token,
      this.fetchImpl
    );
    const defaultBranch = ref.sourceConfig?.branch ?? repoMeta.default_branch;

    let refName = ref.version?.trim();
    if (!refName || refName === 'latest') {
      refName = defaultBranch;
    } else if (semver.validRange(refName) && !semver.valid(refName)) {
      const tagsUrl = `${GITHUB_API}/repos/${owner}/${repo}/git/refs/tags?per_page=100`;
      const tagRefs = await githubJson<TagRef[]>(tagsUrl, this.token, this.fetchImpl);
      const tagNames = tagRefs
        .map((t) => t.ref.replace(/^refs\/tags\//, ''))
        .filter((n) => semver.valid(semver.coerce(n) ?? ''));
      const resolved = semver.maxSatisfying(tagNames, refName, true);
      if (!resolved) {
        throw new Error(`No GitHub tag satisfies ${refName} for ${owner}/${repo}`);
      }
      refName = resolved;
    }

    const url = tarballUrl(owner, repo, refName);
    const checksum = createHash('sha256').update(`${owner}/${repo}@${refName}`).digest('hex');

    return {
      id: `${ref.name}@${refName}`,
      name: ref.name,
      version: refName,
      source: { ...ref, version: refName },
      fetchUrl: url,
      checksum,
      metadata: {
        owner,
        repo,
        subPath: subPath.replace(/^\/+|\/+$/g, ''),
        ref: refName,
      },
    };
  }

  async fetch(metadata: SkillMetadata): Promise<SkillFiles> {
    const meta = metadata.metadata as { owner?: string; repo?: string; subPath?: string; ref?: string };
    const owner = meta?.owner;
    const repo = meta?.repo;
    const ref = meta?.ref;
    const subPath = meta?.subPath ?? '';
    if (!owner || !repo || !ref) throw new Error('Invalid GitHub metadata');

    const url = tarballUrl(owner, repo, ref);
    const headers: Record<string, string> = {};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const res = await this.fetchImpl(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to download tarball: ${res.status}`);
    }

    const tmp = await import('node:fs/promises').then((fs) => fs.mkdtemp(path.join(tmpdir(), 'se-gh-')));
    const tarPath = path.join(tmp, 'src.tgz');
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(tarPath, buf);

    const extractDir = path.join(tmp, 'out');
    await mkdir(extractDir, { recursive: true });
    await tar.x({ file: tarPath, cwd: extractDir });

    const top = await readdir(extractDir, { withFileTypes: true });
    const rootDir = top.find((e) => e.isDirectory());
    const root = rootDir ? path.join(extractDir, rootDir.name) : extractDir;
    const skillRoot = subPath ? path.join(root, subPath) : root;

    const files = await readTextFilesRecursive(skillRoot, skillRoot);
    let manifest: SkillManifest | null = null;
    const mj = files['skill.json'] ?? files['skill.manifest.json'];
    if (mj) {
      manifest = JSON.parse(mj) as SkillManifest;
    }

    await rm(tmp, { recursive: true, force: true });

    return { files, manifest };
  }

  async install(
    metadata: SkillMetadata,
    fetched: SkillFiles,
    ctx: InstallContext
  ): Promise<SkillInstallResult> {
    const dir = path.join(ctx.installRoot, `${metadata.name}@${metadata.version}`);
    await mkdir(dir, { recursive: true });
    const written: string[] = [];
    for (const [rel, content] of Object.entries(fetched.files)) {
      const dest = path.join(dir, rel);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, content, 'utf-8');
      written.push(dest);
    }
    if (fetched.manifest) {
      const dest = path.join(dir, 'skill.json');
      await writeFile(dest, JSON.stringify(fetched.manifest, null, 2), 'utf-8');
      written.push(dest);
    }
    return { installPath: dir, writtenFiles: written };
  }
}

async function readTextFilesRecursive(base: string, dir: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    const rel = path.relative(base, full).split(path.sep).join('/');
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      Object.assign(out, await readTextFilesRecursive(base, full));
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2'].includes(ext)) continue;
      try {
        const fileBuf = await readFile(full);
        if (fileBuf.includes(0)) continue;
        out[rel] = fileBuf.toString('utf-8');
      } catch {
        /* skip */
      }
    }
  }
  return out;
}
