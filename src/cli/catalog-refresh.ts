/**
 * Compare configured catalog sources with spec.yaml and optionally append new modules
 * using YAML Document merge (preserves comments / structure outside appended nodes).
 */

import { copyFile, readFile, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { parseDocument, isSeq, Document } from 'yaml';
import type { YAMLSeq } from 'yaml';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { loadSpec } from '../pipeline/spec-loader.js';
import { flattenSpecModules } from '../types/spec.js';
import { createDynamicSkillRegistry } from '../registry/sources/create-dynamic-skill-registry.js';
import { loadSourcesConfigFromProject } from '../registry/sources/load-sources-config.js';
import {
  ensureDefaultSourcesConfig,
  getModuleInfo,
  invalidateDynamicRegistryCache,
} from './commands.js';
import { DEFAULT_MODULE_TYPE, type AIModuleType } from '../types/ai-module.js';
import { CLI_COMMAND } from '../branding.js';

export interface CatalogRefreshCliOptions {
  cwd: string;
  /** Persist selected modules to spec.yaml */
  write: boolean;
  /** Non-interactive: append up to --max candidates */
  yes: boolean;
  /** Clear GitHub tree listing cache under sources.config cacheDir, then re-fetch */
  refreshSources: boolean;
  max: number;
  json: boolean;
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

export async function runCatalogRefresh(opts: CatalogRefreshCliOptions): Promise<{
  candidateNames: string[];
  added: string[];
  skippedErrors: { name: string; message: string }[];
}> {
  const cwd = path.resolve(opts.cwd);

  await ensureDefaultSourcesConfig(cwd);

  if (opts.refreshSources) {
    await clearGithubListingCache(cwd);
    invalidateDynamicRegistryCache();
  }

  const spinner = ora('Loading catalog…').start();
  let candidateNames: string[] = [];

  try {
    const existing = await existingModuleKeys(cwd);

    const reg = await createDynamicSkillRegistry(cwd);
    if (!reg) {
      spinner.fail('No catalog: add sources.config.yaml with GitHub/npm sources');
      return { candidateNames: [], added: [], skippedErrors: [] };
    }

    const rows = await reg.search('', { limit: 500_000, sortBy: 'name' });
    candidateNames = rows
      .map((r) => r.name)
      .filter((name) => !existing.has(name.trim().toLowerCase()))
      .sort((a, b) => a.localeCompare(b));

    spinner.succeed(`Catalog: ${candidateNames.length} new module(s) not in spec.yaml`);
  } catch (e) {
    spinner.fail('Catalog refresh failed');
    throw e;
  }

  const specPath = path.join(cwd, 'spec.yaml');

  if (!opts.write) {
    if (opts.json) {
      console.log(JSON.stringify({ candidates: candidateNames.length, names: candidateNames }, null, 2));
    } else {
      const preview = candidateNames.slice(0, 40);
      console.log(chalk.gray(`\nNew catalog entries (not in spec): ${candidateNames.length}`));
      if (preview.length) {
        console.log(chalk.gray(preview.map((n) => `  • ${n}`).join('\n')));
        if (candidateNames.length > preview.length) {
          console.log(chalk.gray(`  … and ${candidateNames.length - preview.length} more`));
        }
      }
      console.log(
        chalk.cyan(
          `\nRun ${chalk.bold(`${CLI_COMMAND} catalog refresh --write`)} to append (interactive), or add ${chalk.bold('-y')} for non-interactive (see ${chalk.bold('--max')}).`
        )
      );
    }
    return { candidateNames, added: [], skippedErrors: [] };
  }

  let picked: string[];
  if (opts.yes) {
    picked = candidateNames.slice(0, opts.max);
    if (picked.length < candidateNames.length) {
      console.log(
        chalk.yellow(`--yes: appending first ${picked.length} of ${candidateNames.length} (see --max)`)
      );
    }
  } else {
    if (!candidateNames.length) {
      console.log(chalk.gray('Nothing new to add.'));
      return { candidateNames, added: [], skippedErrors: [] };
    }
    const answer = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'names',
        message: 'Select catalog modules to append under modules: (disabled by default)',
        choices: candidateNames.map((n) => ({ name: n, value: n })),
        pageSize: 15,
      },
    ]);
    picked = answer.names as string[];
    if (!picked?.length) {
      console.log(chalk.gray('No modules selected; spec unchanged.'));
      return { candidateNames, added: [], skippedErrors: [] };
    }
  }

  if (!picked.length) {
    console.log(chalk.gray('Nothing new to add.'));
    return { candidateNames, added: [], skippedErrors: [] };
  }

  const fetchSpin = ora(`Resolving ${picked.length} module(s)…`).start();
  const resolved = await mapPool(picked, 12, async (name) => {
    try {
      const info = await getModuleInfo(name, cwd);
      return { ok: true as const, name, info };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false as const, name, message };
    }
  });
  fetchSpin.succeed('Resolved');

  const skippedErrors = resolved
    .filter((r): r is { ok: false; name: string; message: string } => !r.ok)
    .map((r) => ({
      name: r.name,
      message: r.message,
    }));
  const ok = resolved.filter(
    (r): r is { ok: true; name: string; info: Awaited<ReturnType<typeof getModuleInfo>> } => r.ok
  );

  if (!ok.length) {
    console.log(chalk.yellow('No modules resolved successfully; spec unchanged.'));
    skippedErrors.forEach((s) => console.log(chalk.red(`  ✗ ${s.name}: ${s.message}`)));
    return { candidateNames, added: [], skippedErrors };
  }

  const yamlText = await readFile(specPath, 'utf-8');
  const backupName = `spec.yaml.aistack-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const backupPath = path.join(cwd, backupName);
  await copyFile(specPath, backupPath);

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
    const row = moduleInfoToAppendRow(r.info);
    seq.add(doc.createNode(row));
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
        `Updated spec failed validation; restored original. Backup kept at ${backupName}. ${err instanceof Error ? err.message : String(err)}`
      ),
      { code: 'SPEC_APPEND_VALIDATION_FAILED', cause: err }
    );
  }

  if (!opts.json) {
    console.log(chalk.green(`\n✓ Appended ${added.length} module(s) under ${chalk.bold('modules:')}`));
    console.log(chalk.gray(`  Backup: ${backupName}`));
    if (skippedErrors.length) {
      console.log(chalk.yellow(`  Skipped ${skippedErrors.length} resolve error(s):`));
      skippedErrors.forEach((s) => console.log(chalk.yellow(`    • ${s.name}: ${s.message}`)));
    }
    console.log(chalk.gray('\nNew rows use enabled: false — enable entries you want, then run sync.'));
  } else {
    console.log(JSON.stringify({ added, skippedErrors }, null, 2));
  }

  return { candidateNames, added, skippedErrors };
}
