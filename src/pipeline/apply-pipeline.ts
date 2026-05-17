/**
 * Apply pipeline: load spec → resolve & fetch/install skills → normalize → client adapter → write configs.
 *
 * Idempotency: skill installs use stable `{installRoot}/{name}@{version}`; adapter uses managed overwrite / JSON merge.
 * Error recovery: per-skill try/catch (continue by default); optional rollback of installs on adapter failure.
 */

import { WORKSPACE_DOTDIR } from '../branding.js';
import { rm, stat } from 'node:fs/promises';
import * as path from 'node:path';
import type { SpecFile } from '../types/spec.js';
import { flattenSpecModules } from '../types/spec.js';
import type { Skill } from '../types/skill.js';
import type { SkillManifest, SkillMetadata, SkillReference } from '../types/skill.js';
import { AdapterFactory } from '../client-adapters/adapter-factory.js';
import { normalizeWorkspaceInput } from '../client-adapters/normalize.js';
import type { AdapterApplyReport } from '../client-adapters/adapter-output.js';
import { adapterFilesystemRoot, resolveInstallScope } from '../client-adapters/client-paths.js';
import { SkillSourceFactory } from '../sources/skill-source-factory.js';
import { loadSpec } from './spec-loader.js';
import type { Logger } from './logger.js';
import { createConsoleLogger } from './logger.js';

export interface ApplyPipelineOptions {
  projectRoot: string;
  /** Default: `spec.yaml` under projectRoot */
  specFileName?: string;
  skillSourceFactory?: SkillSourceFactory;
  /** Log level; default `info` */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  logger?: Logger;
  dryRun?: boolean;
  /** Remove existing install dirs before writing (sync --force). */
  forceReinstall?: boolean;
  engineVersion?: string;
  /** If true, first skill error aborts the pipeline (after optional rollback). */
  strict?: boolean;
  /** If adapter apply fails after installs, remove skill dirs installed in this run. */
  rollbackOnAdapterFailure?: boolean;
}

export interface ApplyPipelineError {
  phase: 'load' | 'skill' | 'normalize' | 'adapter' | 'write';
  skill?: string;
  message: string;
  cause?: unknown;
}

export interface ApplyPhaseResult {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface ApplyPipelineResult {
  success: boolean;
  /** True when some skills failed but others were applied (only in non-`strict` runs). */
  partial?: boolean;
  phases: ApplyPhaseResult[];
  skillsResolved: number;
  skillsInstalled: number;
  adapterReport?: AdapterApplyReport;
  errors: ApplyPipelineError[];
  rollbackPerformed?: boolean;
}

function skillToReference(skill: Skill): SkillReference {
  return {
    name: skill.name,
    version: skill.version,
    source: skill.source,
    sourceConfig: skill.sourceConfig,
  };
}

function expandHome(p: string): string {
  if (p.startsWith('~/') || p === '~') {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
    return path.join(home, p.slice(2));
  }
  return p;
}

function defaultInstallRoot(projectRoot: string, spec: SpecFile): string {
  const fromSpec = spec.settings?.stateDir ?? spec.settings?.cacheDir;
  if (fromSpec) {
    const base = expandHome(fromSpec);
    return path.join(base, 'skills');
  }
  return path.join(projectRoot, WORKSPACE_DOTDIR, 'skills');
}

export interface ResolvedSkillPayload {
  id: string;
  name: string;
  version: string;
  description?: string;
  files: Record<string, string>;
  manifest: SkillManifest | null;
  tags?: string[];
  supportedClients?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Full apply: load spec → resolve/fetch/install each skill → run client adapter → write configs.
 */
export async function apply(options: ApplyPipelineOptions): Promise<ApplyPipelineResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const logger = options.logger ?? createConsoleLogger('apply', options.logLevel ?? 'info');
  const sourceFactory = options.skillSourceFactory ?? SkillSourceFactory.withDefaults();
  const phases: ApplyPhaseResult[] = [];
  const errors: ApplyPipelineError[] = [];
  const installedPaths: string[] = [];

  let spec: SpecFile;
  try {
    logger.info('Loading spec', { projectRoot, spec: options.specFileName ?? 'spec.yaml' });
    spec = await loadSpec(projectRoot, options.specFileName ?? 'spec.yaml');
    const moduleCount = flattenSpecModules(spec).length;
    phases.push({ name: 'load', ok: true, detail: `${moduleCount} modules in spec` });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    errors.push({ phase: 'load', message, cause: e });
    phases.push({ name: 'load', ok: false, detail: message });
    return { success: false, phases, skillsResolved: 0, skillsInstalled: 0, errors };
  }

  const installRoot = defaultInstallRoot(projectRoot, spec);
  const enabledSkills = flattenSpecModules(spec).filter((s) => s.enabled !== false);
  const resolvedPayloads: ResolvedSkillPayload[] = [];

  logger.info('Resolving and installing skills', { count: enabledSkills.length, installRoot });

  for (const skill of enabledSkills) {
    const ref = skillToReference(skill);
    const label = `${skill.name} (${skill.source})`;

    try {
      const source = sourceFactory.getFor(ref);
      logger.debug('Resolve skill', { skill: label });
      const metadata: SkillMetadata = await source.resolve(ref);

      logger.debug('Fetch skill', { skill: label, version: metadata.version });
      const fetched = await source.fetch(metadata);

      if (!options.dryRun) {
        const installDir = path.join(installRoot, `${metadata.name}@${metadata.version}`);
        if (options.forceReinstall) {
          try {
            const st = await stat(installDir);
            if (st.isDirectory()) {
              logger.debug('Force reinstall: removing existing install dir', { path: installDir });
              await rm(installDir, { recursive: true, force: true });
            }
          } catch {
            /* not present */
          }
        }
        logger.debug('Install skill', { skill: label, installRoot });
        const installResult = await source.install(metadata, fetched, { installRoot });
        installedPaths.push(installResult.installPath);
      } else {
        logger.info('Dry-run: skip install', { skill: label });
      }

      resolvedPayloads.push({
        id: metadata.id,
        name: skill.name,
        version: metadata.version,
        description: metadata.description ?? fetched.manifest?.description,
        files: fetched.files,
        manifest: fetched.manifest,
        tags: metadata.tags ?? fetched.manifest?.tags,
        supportedClients: metadata.supportedClients ?? fetched.manifest?.supportedClients,
        metadata: {
          ...metadata.metadata,
          specConfig: skill.config,
          moduleType: skill.moduleType,
        },
      });

      phases.push({
        name: `skill:${skill.name}`,
        ok: true,
        detail: options.dryRun ? 'resolved+fetched (dry-run)' : 'resolved+fetched+installed',
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      logger.error('Skill pipeline failed', { skill: label, message });
      errors.push({ phase: 'skill', skill: skill.name, message, cause: e });
      phases.push({ name: `skill:${skill.name}`, ok: false, detail: message });
      if (options.strict) {
        return {
          success: false,
          phases,
          skillsResolved: resolvedPayloads.length,
          skillsInstalled: installedPaths.length,
          errors,
        };
      }
    }
  }

  if (resolvedPayloads.length === 0 && enabledSkills.length > 0) {
    logger.warn('No skills successfully resolved; skipping adapter');
    return {
      success: false,
      phases,
      skillsResolved: 0,
      skillsInstalled: installedPaths.length,
      errors: errors.length
        ? errors
        : [{ phase: 'skill', message: 'All skills failed to resolve or install' }],
    };
  }

  let normalized;
  try {
    logger.info('Normalizing workspace for adapter', { client: spec.client.type });
    normalized = normalizeWorkspaceInput(spec, resolvedPayloads, {
      engineVersion: options.engineVersion,
    });
    phases.push({ name: 'normalize', ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    errors.push({ phase: 'normalize', message, cause: e });
    phases.push({ name: 'normalize', ok: false, detail: message });
    return {
      success: false,
      phases,
      skillsResolved: resolvedPayloads.length,
      skillsInstalled: installedPaths.length,
      errors,
    };
  }

  let adapterReport: AdapterApplyReport | undefined;
  try {
    const adapter = AdapterFactory.getAdapter(spec.client.type);
    logger.info('Running client adapter', { adapter: adapter.name, client: spec.client.type });
    const output = adapter.generateConfig(normalized);
    const adapterRoot = adapterFilesystemRoot(resolveInstallScope(spec.client), projectRoot);
    adapterReport = await adapter.apply(output, projectRoot, {
      dryRun: options.dryRun,
      strictConflicts: false,
      adapterFilesystemRoot: adapterRoot,
    });
    phases.push({
      name: 'adapter',
      ok: !(adapterReport.conflicts?.length),
      detail: `written=${adapterReport.written.length} merged=${adapterReport.merged.length}`,
    });
    logger.info('Adapter finished', {
      written: adapterReport.written.length,
      merged: adapterReport.merged.length,
      skipped: adapterReport.skipped.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error('Adapter phase failed', { message });
    errors.push({ phase: 'adapter', message, cause: e });
    phases.push({ name: 'adapter', ok: false, detail: message });

    let rollbackPerformed = false;
    if (options.rollbackOnAdapterFailure && installedPaths.length && !options.dryRun) {
      logger.warn('Rolling back installed skill directories from this run');
      for (const p of installedPaths) {
        try {
          await rm(p, { recursive: true, force: true });
        } catch (re) {
          logger.warn('Rollback rm failed', { path: p, error: String(re) });
        }
      }
      rollbackPerformed = true;
    }

    return {
      success: false,
      phases,
      skillsResolved: resolvedPayloads.length,
      skillsInstalled: installedPaths.length,
      adapterReport,
      errors,
      rollbackPerformed,
    };
  }

  const skillErrors = errors.filter((e) => e.skill !== undefined);
  const success = skillErrors.length === 0;
  const partial =
    !options.strict && enabledSkills.length > 0 && resolvedPayloads.length < enabledSkills.length;

  logger.info('Apply pipeline complete', {
    success,
    partial,
    skills: resolvedPayloads.length,
  });

  return {
    success,
    partial: partial || undefined,
    phases,
    skillsResolved: resolvedPayloads.length,
    skillsInstalled: installedPaths.length,
    adapterReport,
    errors,
  };
}
