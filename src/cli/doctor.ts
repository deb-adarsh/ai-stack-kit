/**
 * `aistack doctor` — environment and project health checks.
 */

import { existsSync, promises as fs } from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import figures from 'figures';
import { CLI_COMMAND, DEFAULT_RELATIVE_CACHE_DIR } from '../branding.js';
import { AdapterFactory } from '../client-adapters/adapter-factory.js';
import { loadSourcesConfigFromProject } from '../registry/sources/load-sources-config.js';
import { loadSpec } from '../pipeline/spec-loader.js';
import { flattenSpecModules } from '../types/spec.js';

export interface DoctorCheck {
  id: string;
  ok: boolean;
  warn?: boolean;
  message: string;
  hint?: string;
}

export async function runDoctor(cwd: string): Promise<{ checks: DoctorCheck[]; ok: boolean }> {
  const projectRoot = path.resolve(cwd);
  const checks: DoctorCheck[] = [];

  const nodeMajor = parseInt(process.versions.node.split('.')[0] ?? '0', 10);
  checks.push({
    id: 'node',
    ok: nodeMajor >= 18,
    message: `Node.js ${process.versions.node}`,
    hint: nodeMajor >= 18 ? undefined : 'Upgrade to Node.js 18 or newer',
  });

  const specPath = path.join(projectRoot, 'spec.yaml');
  if (!existsSync(specPath)) {
    checks.push({
      id: 'spec',
      ok: false,
      message: 'spec.yaml not found',
      hint: `Run: ${CLI_COMMAND} init`,
    });
  } else {
    checks.push({ id: 'spec', ok: true, message: 'spec.yaml present' });
    try {
      const spec = await loadSpec(projectRoot);
      checks.push({ id: 'spec-valid', ok: true, message: 'spec.yaml validates' });
      try {
        AdapterFactory.getAdapter(spec.client.type);
        checks.push({
          id: 'adapter',
          ok: true,
          message: `client.type "${spec.client.type}" has a built-in adapter`,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        checks.push({
          id: 'adapter',
          ok: false,
          message: `No adapter for client.type "${spec.client.type}"`,
          hint: 'Use cursor, copilot, or claude in spec.yaml',
        });
      }
      const count = flattenSpecModules(spec).filter((m) => m.enabled !== false).length;
      checks.push({
        id: 'modules',
        ok: count > 0,
        warn: count === 0,
        message: `${count} enabled module(s) in spec`,
        hint: count === 0 ? `Run: ${CLI_COMMAND} search <query> then ${CLI_COMMAND} skill add <name>` : undefined,
      });
    } catch (e: unknown) {
      const err = e as { code?: string };
      checks.push({
        id: 'spec-valid',
        ok: false,
        message: err.code === 'VALIDATION_ERROR' ? 'spec.yaml failed validation' : 'Could not load spec.yaml',
        hint: `Run: ${CLI_COMMAND} validate`,
      });
    }
  }

  const sourcesPath = path.join(projectRoot, 'sources.config.yaml');
  if (!existsSync(sourcesPath)) {
    checks.push({
      id: 'sources',
      ok: false,
      message: 'sources.config.yaml not found',
      hint: `Run: ${CLI_COMMAND} init`,
    });
  } else {
    checks.push({ id: 'sources', ok: true, message: 'sources.config.yaml present' });
    try {
      const cfg = await loadSourcesConfigFromProject(projectRoot);
      const hasGithub = cfg ? (cfg.sources ?? []).some((s) => s.type === 'github') : false;
      if (hasGithub && !process.env.GITHUB_TOKEN) {
        checks.push({
          id: 'github-token',
          ok: true,
          warn: true,
          message: 'GITHUB_TOKEN not set (GitHub catalog search may rate-limit)',
          hint: 'export GITHUB_TOKEN=ghp_…  # fine-grained: Contents read on public repos',
        });
      } else if (hasGithub) {
        checks.push({
          id: 'github-token',
          ok: true,
          message: 'GITHUB_TOKEN is set',
        });
      }
    } catch {
      checks.push({
        id: 'sources',
        ok: false,
        message: 'sources.config.yaml could not be parsed',
      });
    }
  }

  const cacheDir = path.join(projectRoot, DEFAULT_RELATIVE_CACHE_DIR);
  checks.push({
    id: 'cache',
    ok: true,
    message: existsSync(cacheDir) ? `Catalog cache present (${DEFAULT_RELATIVE_CACHE_DIR})` : 'No catalog cache yet (normal before first search)',
  });

  try {
    await fs.access(projectRoot, fs.constants.W_OK);
    checks.push({ id: 'writable', ok: true, message: 'Project directory is writable' });
  } catch {
    checks.push({
      id: 'writable',
      ok: false,
      message: 'Project directory is not writable',
    });
  }

  const ok = checks.every((c) => c.ok && !c.warn);
  const hasFailure = checks.some((c) => !c.ok);
  return { checks, ok: !hasFailure };
}

export function printDoctorReport(checks: DoctorCheck[]): void {
  console.log(chalk.cyan.bold('\nAI Stack Kit doctor\n'));
  for (const c of checks) {
    const icon = !c.ok ? chalk.red(figures.cross) : c.warn ? chalk.yellow(figures.warning) : chalk.green(figures.tick);
    const label = !c.ok ? chalk.red(c.message) : c.warn ? chalk.yellow(c.message) : chalk.white(c.message);
    console.log(`  ${icon}  ${label}`);
    if (c.hint) {
      console.log(chalk.gray(`      ${c.hint}`));
    }
  }
  console.log();
}
