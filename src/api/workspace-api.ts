/**
 * Headless workspace API for embedders (VS Code extension, CI, tests).
 */

import { existsSync, promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { apply, type ApplyPipelineResult } from '../pipeline/apply-pipeline.js';
import { loadSpec } from '../pipeline/spec-loader.js';
import type { Logger } from '../pipeline/logger.js';
import { createConsoleLogger } from '../pipeline/logger.js';
import { flattenSpecModules } from '../types/spec.js';
import type { Skill } from '../types/skill.js';
import type { ClientType, SpecFile } from '../types/spec.js';
import {
  addModuleToSpec,
  ensureDefaultSourcesConfig,
  ensureProjectGitignoreForAistack,
  getModuleInfo,
  getModuleVersions,
  removeModuleFromSpec,
  runStatus,
  searchModules,
  createSpecFile,
  validateSpecFile,
} from '../cli/commands.js';
import { runDoctor, type DoctorCheck } from '../cli/doctor.js';
import {
  agentsDirRelative,
  hooksDirRelative,
  resolveInstallScope,
  skillsDirRelative,
  adapterFilesystemRoot,
} from '../client-adapters/client-paths.js';
import { runCatalogRefreshCore } from './catalog-refresh-core.js';
import { createCallbackLogger } from './callback-logger.js';
import type {
  AddModuleOptions,
  AistackInitOptions,
  CatalogRefreshOptions,
  CatalogRefreshResult,
  OutputPathEntry,
  SearchOptions,
  SyncOptions,
} from './types.js';

export class AistackWorkspace {
  constructor(readonly projectRoot: string) {}

  get specPath(): string {
    return path.join(this.projectRoot, 'spec.yaml');
  }

  hasSpec(): boolean {
    return existsSync(this.specPath);
  }

  async init(options: AistackInitOptions): Promise<void> {
    await createSpecFile(
      {
        project: {
          projectName: options.projectName ?? path.basename(this.projectRoot),
          description: options.description ?? 'AI Stack Kit workspace',
          author: options.author ?? '',
        },
        client: options.clientType,
        skills: options.skills ?? [],
        settings: { autoSync: false, verifyChecksums: true },
      },
      this.projectRoot
    );
    await this.setClientType(options.clientType, options.installScope ?? 'project');
    await ensureDefaultSourcesConfig(this.projectRoot);
    await ensureProjectGitignoreForAistack(this.projectRoot);
  }

  async readSpec(): Promise<SpecFile> {
    return loadSpec(this.projectRoot);
  }

  async validate(): Promise<{ valid: boolean; errors?: { path: string; message: string }[] }> {
    return validateSpecFile(this.projectRoot);
  }

  async search(query: string, opts: SearchOptions = {}) {
    return searchModules(query, { cwd: this.projectRoot, ...opts });
  }

  async getModuleInfo(name: string) {
    return getModuleInfo(name, this.projectRoot);
  }

  async getModuleVersions(name: string) {
    return getModuleVersions(name, this.projectRoot);
  }

  async addModule(opts: AddModuleOptions): Promise<void> {
    let source = opts.source;
    let sourceConfig = opts.sourceConfig;
    if (!source || !sourceConfig) {
      const info = (await getModuleInfo(opts.name, this.projectRoot)) as {
        source: string;
        sourceConfig?: Record<string, unknown>;
      };
      source = source ?? info.source;
      const cfg = info.sourceConfig;
      sourceConfig = sourceConfig ?? cfg;
    }
    if (!source) {
      throw Object.assign(new Error(`Could not resolve source for "${opts.name}"`), {
        code: 'MODULE_NOT_FOUND',
      });
    }
    await addModuleToSpec(
      {
        name: opts.name,
        version: opts.version ?? 'latest',
        source: source!,
        sourceConfig,
        config: opts.config,
        moduleType: opts.moduleType,
        clientInstallScope: opts.clientInstallScope,
      },
      this.projectRoot
    );
  }

  async removeModule(name: string): Promise<void> {
    await removeModuleFromSpec(name, this.projectRoot);
  }

  async setModuleEnabled(name: string, enabled: boolean): Promise<void> {
    const specPath = this.specPath;
    const content = await fs.readFile(specPath, 'utf-8');
    const spec = yaml.load(content) as SpecFile;
    if (!Array.isArray(spec.skills)) spec.skills = [];
    if (!Array.isArray(spec.modules)) spec.modules = [];
    let row: Skill | undefined = spec.skills.find((s) => s.name === name);
    if (!row) row = spec.modules!.find((s) => s.name === name);
    if (!row) {
      throw Object.assign(new Error(`Module "${name}" not found in spec`), { code: 'MODULE_NOT_FOUND' });
    }
    row.enabled = enabled;
    await fs.writeFile(specPath, yaml.dump(spec, { indent: 2, lineWidth: -1 }), 'utf-8');
  }

  async setClientType(clientType: ClientType, installScope?: 'project' | 'user'): Promise<void> {
    const spec = await this.readSpec();
    spec.client.type = clientType;
    if (installScope === 'user') {
      spec.client.installScope = 'user';
    } else if (installScope === 'project') {
      delete spec.client.installScope;
    }
    await fs.writeFile(this.specPath, yaml.dump(spec, { indent: 2, lineWidth: -1 }), 'utf-8');
  }

  async sync(options: SyncOptions = {}): Promise<ApplyPipelineResult> {
    if (!options.dryRun) {
      await ensureProjectGitignoreForAistack(this.projectRoot);
    }
    const logger: Logger =
      options.verbose && typeof options.logLevel === 'undefined'
        ? createConsoleLogger('apply', 'debug')
        : createConsoleLogger('apply', options.verbose ? 'debug' : options.logLevel ?? 'info');

    return apply({
      projectRoot: this.projectRoot,
      dryRun: options.dryRun,
      forceReinstall: options.forceReinstall,
      logLevel: options.verbose ? 'debug' : options.logLevel ?? 'info',
      logger,
    });
  }

  syncWithLogger(options: SyncOptions, onLog: Parameters<typeof createCallbackLogger>[0]): Promise<ApplyPipelineResult> {
    return apply({
      projectRoot: this.projectRoot,
      dryRun: options.dryRun,
      forceReinstall: options.forceReinstall,
      logLevel: options.verbose ? 'debug' : options.logLevel ?? 'info',
      logger: createCallbackLogger(onLog, options.verbose ? 'debug' : options.logLevel ?? 'info'),
    });
  }

  async doctor(): Promise<{ checks: DoctorCheck[]; ok: boolean }> {
    return runDoctor(this.projectRoot);
  }

  async status() {
    return runStatus(this.projectRoot);
  }

  async catalogRefresh(options: CatalogRefreshOptions = {}): Promise<CatalogRefreshResult> {
    return runCatalogRefreshCore({
      cwd: this.projectRoot,
      write: Boolean(options.write),
      namesToAppend: options.namesToAppend,
      refreshSources: options.refreshSources,
      max: options.max,
    });
  }

  /** Resolved output directories for the active client adapter. */
  async listOutputPaths(): Promise<OutputPathEntry[]> {
    if (!this.hasSpec()) return [];
    const spec = await this.readSpec();
    const scope = resolveInstallScope(spec.client);
    const root = adapterFilesystemRoot(scope, this.projectRoot);
    const clientType = spec.client.type;

    const rels = [
      { label: 'Skills', rel: skillsDirRelative(clientType, scope) },
      { label: 'Agents', rel: agentsDirRelative(clientType, scope) },
      { label: 'Hooks', rel: hooksDirRelative(clientType, scope) },
    ];

    if (clientType === 'copilot') {
      rels.push({ label: 'VS Code settings (aistack)', rel: '.vscode/settings.json' });
    }

    return rels.map(({ label, rel }) => {
      const absolutePath = path.join(root, rel);
      return {
        label,
        relativePath: rel,
        absolutePath,
        exists: existsSync(absolutePath),
      };
    });
  }

  listSpecModules(): Promise<
    { name: string; moduleType: string; enabled: boolean; version: string; source: string; section: 'skills' | 'modules' }[]
  > {
    return this.readSpec().then((spec) => {
      const rows: {
        name: string;
        moduleType: string;
        enabled: boolean;
        version: string;
        source: string;
        section: 'skills' | 'modules';
      }[] = [];
      for (const s of spec.skills ?? []) {
        rows.push({
          name: s.name,
          moduleType: String(s.moduleType ?? 'skill'),
          enabled: s.enabled !== false,
          version: s.version ?? 'latest',
          source: String(s.source),
          section: 'skills',
        });
      }
      for (const m of spec.modules ?? []) {
        rows.push({
          name: m.name,
          moduleType: String(m.moduleType ?? 'skill'),
          enabled: m.enabled !== false,
          version: m.version ?? 'latest',
          source: String(m.source),
          section: 'modules',
        });
      }
      return rows;
    });
  }
}
