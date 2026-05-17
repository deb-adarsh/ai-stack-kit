/**
 * Headless catalog refresh (append modules to spec.yaml). CLI and VS Code extension share this.
 */

import { copyFile, readFile, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { parseDocument, isSeq, Document } from 'yaml';
import type { YAMLSeq } from 'yaml';
import { loadSpec } from '../pipeline/spec-loader.js';
import { flattenSpecModules } from '../types/spec.js';
import { createDynamicSkillRegistry } from '../registry/sources/create-dynamic-skill-registry.js';
import { loadSourcesConfigFromProject } from '../registry/sources/load-sources-config.js';
import {
  ensureDefaultSourcesConfig,
  getModuleInfo,
  invalidateDynamicRegistryCache,
} from '../cli/commands.js';
import { DEFAULT_MODULE_TYPE, type AIModuleType } from '../types/ai-module.js';
import type { CatalogRefreshResult } from './types.js';

export interface CatalogRefreshCoreOptions {
  cwd: string;
  write: boolean;
  /** When write=true, append these catalog names (non-interactive). */
  namesToAppend?: string[];
  refreshSources?: boolean;
  max?: number;
}

function pruneUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const nested = pruneUndefined(v as Record<string, unknown>);
      if (Object.keys(nested).length > 0) out[k] = nested;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function moduleInfoToAppendRow(info: {
  name: string;
  source: string;
  sourceConfig?: Record<string, unknown>;
  moduleType?: AIModuleType;
}): Record<string, unknown> {
  const mt: AIModuleType = info.moduleType ?? DEFAULT_MODULE_TYPE;
  const row: Record<string, unknown> = {
    name: info.name,
    version: 'latest',
    source: info.source,
    enabled: false,
    moduleType: mt,
  };
  if (info.sourceConfig && typeof info.sourceConfig === 'object') {
    row.sourceConfig = pruneUndefined(info.sourceConfig as Record<string, unknown>);
  }
  return row;
}

async function clearGithubListingCache(cwd: string): Promise<void> {
  const cfg = await loadSourcesConfigFromProject(cwd);
  const root = cfg?.cacheDir?.trim() || '.cache/aistack';
  const dir = path.join(cwd, root, 'github-catalog');
  await rm(dir, { recursive: true, force: true });
}

async function existingModuleKeys(cwd: string): Promise<Set<string>> {
  const spec = await loadSpec(cwd, 'spec.yaml');
  const set = new Set<string>();
  for (const m of flattenSpecModules(spec)) {
    set.add(m.name.trim().toLowerCase());
  }
  return set;
}

function ensureModulesSeq(doc: Document): YAMLSeq {
  const m = doc.get('modules');
  if (m === undefined || m === null) {
    doc.set('modules', doc.createNode([]));
    const next = doc.get('modules');
    if (!isSeq(next)) {
      throw Object.assign(new Error('Could not create spec.yaml `modules` sequence'), {
        code: 'SPEC_MODULES_NOT_SEQUENCE',
      });
    }
    return next;
  }
  if (!isSeq(m)) {
    throw Object.assign(
      new Error('spec.yaml `modules` must be a YAML sequence (array) to append catalog rows'),
      { code: 'SPEC_MODULES_NOT_SEQUENCE' }
    );
  }
  return m;
}

async function mapPool<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function runWorker(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: n }, () => runWorker()));
  return results;
}

export async function runCatalogRefreshCore(
  opts: CatalogRefreshCoreOptions
): Promise<CatalogRefreshResult> {
  const cwd = path.resolve(opts.cwd);
  const max = opts.max ?? 500;

  await ensureDefaultSourcesConfig(cwd);

  if (opts.refreshSources) {
    await clearGithubListingCache(cwd);
    invalidateDynamicRegistryCache();
  }

  let candidateNames: string[] = [];

  const existing = await existingModuleKeys(cwd);
  const reg = await createDynamicSkillRegistry(cwd);
  if (!reg) {
    return { candidateNames: [], added: [], skippedErrors: [] };
  }

  const rows = await reg.search('', { limit: 500_000, sortBy: 'name' });
  candidateNames = rows
    .map((r) => r.name)
    .filter((name) => !existing.has(name.trim().toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  if (!opts.write) {
    return { candidateNames, added: [], skippedErrors: [] };
  }

  const picked = (opts.namesToAppend ?? candidateNames.slice(0, max)).slice(0, max);
  if (!picked.length) {
    return { candidateNames, added: [], skippedErrors: [] };
  }

  const specPath = path.join(cwd, 'spec.yaml');
  const resolved = await mapPool(picked, 12, async (name) => {
    try {
      const info = await getModuleInfo(name, cwd);
      return { ok: true as const, name, info };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false as const, name, message };
    }
  });

  const skippedErrors = resolved
    .filter((r): r is { ok: false; name: string; message: string } => !r.ok)
    .map((r) => ({ name: r.name, message: r.message }));
  const ok = resolved.filter(
    (r): r is { ok: true; name: string; info: Awaited<ReturnType<typeof getModuleInfo>> } => r.ok
  );

  if (!ok.length) {
    return { candidateNames, added: [], skippedErrors };
  }

  const yamlText = await readFile(specPath, 'utf-8');
  const backupName = `spec.yaml.aistack-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  await copyFile(specPath, path.join(cwd, backupName));

  let doc: Document;
  try {
    doc = parseDocument(yamlText);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw Object.assign(new Error(`Failed to parse spec.yaml: ${message}`), {
      code: 'SPEC_PARSE_ERROR',
    });
  }

  const seq = ensureModulesSeq(doc);
  const added: string[] = [];
  for (const r of ok) {
    seq.add(doc.createNode(moduleInfoToAppendRow(r.info)));
    added.push(r.name);
  }

  const nextYaml = String(doc);
  try {
    await writeFile(specPath, nextYaml, 'utf-8');
    await loadSpec(cwd, 'spec.yaml');
  } catch (err) {
    await writeFile(specPath, yamlText, 'utf-8');
    throw Object.assign(
      new Error(
        `Updated spec failed validation; restored original. Backup: ${backupName}. ${err instanceof Error ? err.message : String(err)}`
      ),
      { code: 'SPEC_APPEND_VALIDATION_FAILED', cause: err }
    );
  }

  return { candidateNames, added, skippedErrors };
}
