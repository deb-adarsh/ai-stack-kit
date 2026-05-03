/**
 * npm skill source: resolve from registry metadata, fetch package tarball, extract config / manifest.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import * as tar from 'tar';
import semver from 'semver';
import type { SkillManifest, SkillMetadata, SkillReference } from '../../types/skill.js';
import type { InstallContext, SkillFiles, SkillInstallResult, SkillSource } from '../base/skill-source.js';

export interface NpmSourceOptions {
  /** Registry base URL (default https://registry.npmjs.org) */
  registryUrl?: string;
  fetchImpl?: typeof fetch;
}

interface NpmPackageDoc {
  name: string;
  description?: string;
  'dist-tags'?: Record<string, string>;
  versions: Record<
    string,
    {
      dist?: { tarball?: string; shasum?: string };
      dependencies?: Record<string, string>;
    }
  >;
}

function fullPackageName(ref: SkillReference): string {
  const scope = ref.sourceConfig?.scope?.replace(/^@/, '');
  const rawName = ref.name.trim();
  if (rawName.startsWith('@')) {
    return rawName;
  }
  if (scope) {
    return `@${scope}/${rawName}`;
  }
  return rawName;
}

function resolvedPackageName(ref: SkillReference): string {
  const fromConfig =
    typeof ref.sourceConfig?.package === 'string' ? ref.sourceConfig.package.trim() : '';
  if (fromConfig) return fromConfig;
  return fullPackageName(ref);
}

export class NpmSource implements SkillSource {
  readonly type = 'npm' as const;
  private readonly registryUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: NpmSourceOptions = {}) {
    this.registryUrl = (options.registryUrl ?? 'https://registry.npmjs.org').replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  canHandle(ref: SkillReference): boolean {
    return ref.source === 'npm';
  }

  async resolve(ref: SkillReference): Promise<SkillMetadata> {
    const pkg = resolvedPackageName(ref);
    const registryBase =
      typeof ref.sourceConfig?.registry === 'string' && ref.sourceConfig.registry.trim().length
        ? ref.sourceConfig.registry.trim().replace(/\/$/, '')
        : this.registryUrl;
    const encoded = encodeURIComponent(pkg).replace(/%40/g, '@');
    const url = `${registryBase}/${encoded}`;
    const res = await this.fetchImpl(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`npm registry ${res.status} for ${pkg}`);
    }
    const doc = (await res.json()) as NpmPackageDoc;

    const range =
      ref.version?.trim() ||
      (typeof ref.sourceConfig?.version === 'string' ? ref.sourceConfig.version.trim() : '') ||
      doc['dist-tags']?.latest;
    if (!range) throw new Error(`No version for ${pkg}`);

    let version: string;
    if (semver.valid(range)) {
      version = range;
    } else if (doc['dist-tags']?.[range]) {
      version = doc['dist-tags'][range]!;
    } else {
      const versions = Object.keys(doc.versions);
      const resolved = semver.maxSatisfying(versions, range, true);
      if (!resolved) throw new Error(`No npm version satisfies ${range} for ${pkg}`);
      version = resolved;
    }

    const verDoc = doc.versions[version];
    const tarball = verDoc?.dist?.tarball;
    if (!tarball) throw new Error(`No tarball for ${pkg}@${version}`);

    const checksum =
      verDoc.dist?.shasum ??
      createHash('sha256').update(`${pkg}@${version}:${tarball}`).digest('hex');

    return {
      id: `${ref.name}@${version}`,
      name: ref.name,
      version,
      source: { ...ref, version },
      description: doc.description,
      fetchUrl: tarball,
      checksum,
      dependencies: verDoc.dependencies
        ? Object.entries(verDoc.dependencies).map(([name, v]) => ({
            name,
            version: v,
            source: 'npm' as const,
            sourceConfig: {
              registry: ref.sourceConfig?.registry,
              ...(name.startsWith('@')
                ? { scope: name.slice(1).split('/')[0] }
                : {}),
            },
          }))
        : undefined,
      metadata: {
        packageName: pkg,
        registryUrl: registryBase,
        skillSubPath:
          typeof ref.sourceConfig?.path === 'string' ? ref.sourceConfig.path.replace(/^\/+|\/+$/g, '') : '',
      },
    };
  }

  async fetch(metadata: SkillMetadata): Promise<SkillFiles> {
    const res = await this.fetchImpl(metadata.fetchUrl, { headers: { Accept: 'application/octet-stream' } });
    if (!res.ok) throw new Error(`npm tarball ${res.status}`);

    const tmp = await import('node:fs/promises').then((fs) => fs.mkdtemp(path.join(tmpdir(), 'se-npm-')));
    const tarPath = path.join(tmp, 'pkg.tgz');
    await writeFile(tarPath, Buffer.from(await res.arrayBuffer()));

    const extractDir = path.join(tmp, 'out');
    await mkdir(extractDir, { recursive: true });
    await tar.x({ file: tarPath, cwd: extractDir });

    const top = await readdir(extractDir, { withFileTypes: true });
    const pkgDir = top.find((e) => e.isDirectory() && e.name === 'package');
    const root = pkgDir ? path.join(extractDir, 'package') : extractDir;

    const files = await readTextFilesRecursive(root, root);
    let manifest: SkillManifest | null = null;

    const meta = metadata.metadata as { skillSubPath?: string } | undefined;
    const sub = typeof meta?.skillSubPath === 'string' ? meta.skillSubPath.replace(/^\/+|\/+$/g, '') : '';
    let scopedFiles = files;
    if (sub) {
      const prefix = `${sub}/`;
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(files)) {
        if (k === sub) {
          next[path.basename(k)] = v;
        } else if (k.startsWith(prefix)) {
          next[k.slice(prefix.length)] = v;
        }
      }
      scopedFiles = next;
    }

    let skillJson = scopedFiles['skill.json'] ?? scopedFiles['skill.manifest.json'];
    if (skillJson) {
      manifest = JSON.parse(skillJson) as SkillManifest;
    } else {
      const pkgJson = scopedFiles['package.json'];
      if (pkgJson) {
        const pkg = JSON.parse(pkgJson) as Record<string, unknown>;
        const se = (pkg.specEngine ?? pkg['spec-engine']) as Record<string, unknown> | undefined;
        if (se?.skillManifest) {
          manifest = se.skillManifest as SkillManifest;
        } else {
          manifest = {
            manifestVersion: '1.0',
            name: (pkg.name as string) ?? metadata.name,
            version: (pkg.version as string) ?? metadata.version,
            description: pkg.description as string | undefined,
            author: typeof pkg.author === 'string' ? pkg.author : undefined,
            license: pkg.license as string | undefined,
            main: (pkg.main as string) ?? 'SKILL.md',
          };
        }
      }
    }

    await rm(tmp, { recursive: true, force: true });
    return { files: scopedFiles, manifest };
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
