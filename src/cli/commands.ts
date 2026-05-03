/**
 * CLI Command Handlers
 * 
 * Implements the business logic for each CLI command
 */

import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { NPM_PACKAGE_NAME, WORKSPACE_DOTDIR } from '../branding.js';
import { SpecFile } from '../types/spec.js';
import type { Skill } from '../types/skill.js';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { loadSpec } from '../pipeline/spec-loader.js';
import { apply } from '../pipeline/apply-pipeline.js';
import { createDynamicSkillRegistry } from '../registry/sources/create-dynamic-skill-registry.js';
import type { RegistryProvider } from '../registry/discovery/registry-provider.js';
import { DEFAULT_MODULE_TYPE, type AIModuleType } from '../types/ai-module.js';
import type { RegistryEntry, RegistrySearchResult } from '../types/registry.js';
import { detectProjectSignals } from './project-detection.js';
import { buildSkillSuggestions, filterSuggestible } from './skill-suggestions.js';
import { fileURLToPath } from 'node:url';

let dynamicRegistryCache: { cwd: string; registry: RegistryProvider | null } | null = null;

const bundledSourcesConfigTemplate = fileURLToPath(
  new URL('../../templates/sources.config.yaml', import.meta.url)
);

/** Copy bundled default GitHub/npm catalog definitions when `sources.config.yaml` is missing. */
export async function ensureDefaultSourcesConfig(projectRoot: string): Promise<void> {
  const dest = path.join(projectRoot, 'sources.config.yaml');
  if (existsSync(dest)) return;
  await fs.copyFile(bundledSourcesConfigTemplate, dest);
}

async function getDynamicRegistry(cwd: string): Promise<RegistryProvider | null> {
  if (dynamicRegistryCache?.cwd === cwd) {
    return dynamicRegistryCache.registry;
  }
  const registry = await createDynamicSkillRegistry(cwd);
  dynamicRegistryCache = { cwd, registry };
  return registry;
}

/** Drop cached registry so the next lookup rebuilds providers (e.g. after clearing catalog cache on disk). */
export function invalidateDynamicRegistryCache(): void {
  dynamicRegistryCache = null;
}

const KNOWN_MODULE_TYPES: AIModuleType[] = ['skill', 'subagent', 'hook'];

/** Parse CLI `--type` / config values (throws with `code: INVALID_MODULE_TYPE`). */
export function parseModuleTypeCli(raw: string): AIModuleType {
  const t = raw.trim().toLowerCase() as AIModuleType;
  if (KNOWN_MODULE_TYPES.includes(t)) return t;
  throw Object.assign(new Error(`Invalid module type "${raw}". Use: skill, subagent, hook`), {
    code: 'INVALID_MODULE_TYPE',
  });
}

function mergeHybridSearch(
  dynamicRows: RegistrySearchResult[],
  offlineHits: ModuleSearchHit[],
  limit: number
): ModuleSearchHit[] {
  const catalog: ModuleSearchHit[] = dynamicRows.map((r) => ({
    name: r.name,
    version: r.version,
    description: r.description,
    tags: r.tags,
    downloads: r.downloads,
    source: r.sourceType ?? 'github',
    moduleType: r.moduleType ?? DEFAULT_MODULE_TYPE,
    score: (r.score ?? 0) + 0.02,
    origin: 'catalog' as const,
  }));
  const seen = new Set(catalog.map((d) => d.name.toLowerCase()));
  const merged: ModuleSearchHit[] = [...catalog];
  for (const o of offlineHits) {
    if (seen.has(o.name.toLowerCase())) continue;
    merged.push({
      ...o,
      origin: 'local',
      moduleType: o.moduleType ?? DEFAULT_MODULE_TYPE,
      score: (o.score ?? 0.08) + (o.downloads ? Math.min(0.04, (o.downloads / 1_000_000) * 0.01) : 0),
    });
  }
  merged.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return merged.slice(0, limit);
}

async function buildOfflineSearchHits(
  cwd: string,
  query: string,
  opts: { tags?: string[]; client?: string; limit: number; moduleTypes?: AIModuleType[] }
): Promise<ModuleSearchHit[]> {
  if (opts.moduleTypes?.length && !opts.moduleTypes.includes(DEFAULT_MODULE_TYPE)) {
    return [];
  }
  const signals = await detectProjectSignals(cwd);
  let list = buildSkillSuggestions(signals);
  if (opts.tags?.length) {
    list = list.filter((s) => opts.tags!.every((t) => s.tags.includes(t)));
  }
  if (opts.client) {
    const c = opts.client.toLowerCase();
    list = list.filter((s) => s.lane === 'ui' || s.lane === 'shared' || c === 'cursor');
  }
  const hits = filterSuggestible(query, list).slice(0, opts.limit);
  return hits.map((s) => ({
    name: s.name,
    version: 'latest',
    description: s.description,
    tags: s.tags,
    downloads: Math.round((s.score ?? 0) * 100_000),
    source: s.source,
    moduleType: DEFAULT_MODULE_TYPE,
    score: s.score ?? 0.1,
    origin: 'local' as const,
  }));
}

/**
 * Detect installed client/IDE
 */
export async function detectClient(): Promise<{ name: string; type: string; version?: string }> {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  
  // Check for Cursor
  const cursorPath = path.join(homeDir, '.cursor');
  if (await exists(cursorPath)) {
    return { name: 'Cursor', type: 'cursor' };
  }
  
  // Check for VSCode
  const vscodePath = path.join(homeDir, '.vscode');
  if (await exists(vscodePath)) {
    return { name: 'VS Code', type: 'vscode' };
  }
  
  // Check for IntelliJ
  const intellijPaths = [
    path.join(homeDir, '.IntelliJIdea'),
    path.join(homeDir, 'Library/Application Support/JetBrains'),
  ];
  
  for (const p of intellijPaths) {
    if (await exists(p)) {
      return { name: 'IntelliJ IDEA', type: 'intellij' };
    }
  }
  
  return { name: 'Unknown', type: 'unknown' };
}

/**
 * Suggested skill row for CLI / init (back-compat shape).
 */
export interface SuggestedSkill {
  name: string;
  description: string;
  recommended: boolean;
  source: string;
  lane?: string;
  tags?: string[];
  score?: number;
}

/** Search hit for catalog / CLI (dynamic registry or offline suggestions). */
export interface ModuleSearchHit {
  name: string;
  version: string;
  description: string;
  tags: string[];
  downloads?: number;
  source: string;
  /** When listed from a GitHub tree source */
  repository?: string;
  /** Relevance when using dynamic registry */
  score?: number;
  /** `catalog` = configured sources; `local` = bundled offline suggestions (hybrid mode). */
  origin?: 'catalog' | 'local';
  /** AI module kind when known (skills / subagents / hooks). */
  moduleType?: AIModuleType;
}

/** @deprecated Use {@link ModuleSearchHit} */
export type SkillSearchHit = ModuleSearchHit;

/**
 * Project-aware suggestions (React → UI lane, Node → backend lane).
 */
export async function suggestSkills(cwd: string): Promise<SuggestedSkill[]> {
  const signals = await detectProjectSignals(cwd);
  return buildSkillSuggestions(signals).map((s) => ({
    name: s.name,
    description: s.description,
    recommended: s.recommended,
    source: s.source,
    lane: s.lane,
    tags: s.tags,
    score: s.score,
  }));
}

/**
 * Search configured catalogs (and offline hints). Omit `moduleTypes` to search all kinds.
 */
export async function searchModules(
  query: string,
  opts: {
    cwd?: string;
    limit?: number;
    tags?: string[];
    client?: string;
    moduleTypes?: AIModuleType[];
  } = {}
): Promise<ModuleSearchHit[]> {
  const cwd = opts.cwd ?? process.cwd();
  const limit = opts.limit ?? 50;
  const reg = await getDynamicRegistry(cwd);

  if (reg) {
    const rows = await reg.search(query, {
      limit: Math.min(500, limit * 4),
      tags: opts.tags,
      supportedClients: opts.client ? [opts.client] : undefined,
      moduleTypes: opts.moduleTypes,
    });
    const offline = await buildOfflineSearchHits(cwd, query, {
      tags: opts.tags,
      client: opts.client,
      limit: Math.min(80, limit * 2),
      moduleTypes: opts.moduleTypes,
    });
    return mergeHybridSearch(rows, offline, limit);
  }

  return buildOfflineSearchHits(cwd, query, {
    tags: opts.tags,
    client: opts.client,
    limit,
    moduleTypes: opts.moduleTypes,
  });
}

/** Search entries catalogued as skills only (plus offline skill suggestions). */
export function searchSkills(
  query: string,
  opts: { cwd?: string; limit?: number; tags?: string[]; client?: string } = {}
): Promise<ModuleSearchHit[]> {
  return searchModules(query, { ...opts, moduleTypes: ['skill'] });
}

/** Search entries catalogued as subagents only. */
export function searchSubagents(
  query: string,
  opts: { cwd?: string; limit?: number; tags?: string[]; client?: string } = {}
): Promise<ModuleSearchHit[]> {
  return searchModules(query, { ...opts, moduleTypes: ['subagent'] });
}

/** Search entries catalogued as hooks only. */
export function searchHooks(
  query: string,
  opts: { cwd?: string; limit?: number; tags?: string[]; client?: string } = {}
): Promise<ModuleSearchHit[]> {
  return searchModules(query, { ...opts, moduleTypes: ['hook'] });
}

async function getOfflineModuleInfo(moduleName: string, cwd: string) {
  const signals = await detectProjectSignals(cwd);
  const catalog = buildSkillSuggestions(signals);
  const hit = catalog.find((c) => c.name === moduleName || c.id === moduleName);
  if (!hit) {
    throw Object.assign(new Error(`Module "${moduleName}" not found in local catalog`), {
      code: 'MODULE_NOT_FOUND',
    });
  }
  return {
    name: hit.name,
    version: 'latest',
    description: hit.description,
    tags: hit.tags,
    source: hit.source,
    moduleType: DEFAULT_MODULE_TYPE,
    author: 'AI Stack Kit catalog',
    license: 'MIT',
    repository: undefined,
    stats: { downloads: Math.round((hit.score ?? 0) * 100_000) },
  };
}

function moduleTypeFromRegistryEntry(entry: RegistryEntry): AIModuleType {
  return (
    (entry.metadata?.moduleType as AIModuleType | undefined) ??
    (entry.source.config?.moduleType as AIModuleType | undefined) ??
    DEFAULT_MODULE_TYPE
  );
}

/** Resolve one catalog entry by name (any `moduleType`). */
export async function getModuleInfo(moduleName: string, cwd = process.cwd()) {
  const reg = await getDynamicRegistry(cwd);
  if (reg) {
    const entry = await reg.getSkill(moduleName);
    if (entry) {
      const moduleType = moduleTypeFromRegistryEntry(entry);
      const cfg = (entry.source.config ?? {}) as Record<string, unknown>;
      const owner = typeof cfg.owner === 'string' ? cfg.owner : '';
      const repo = typeof cfg.repo === 'string' ? cfg.repo : '';
      const skillPath = typeof cfg.path === 'string' ? cfg.path : '';
      const branch = typeof cfg.branch === 'string' ? cfg.branch : 'main';
      const pkg = typeof cfg.package === 'string' ? cfg.package : '';
      const ver = typeof cfg.version === 'string' ? cfg.version : entry.latest;
      const registry = typeof cfg.registry === 'string' ? cfg.registry : undefined;

      if (entry.source.type === 'npm') {
        return {
          name: entry.name,
          version: ver,
          description: entry.description,
          tags: entry.tags,
          source: 'npm',
          sourceConfig: {
            package: pkg,
            path: skillPath,
            version: ver,
            registry,
          },
          moduleType,
          author: entry.author ?? 'npm catalog',
          license: entry.license ?? 'See package license',
          repository: entry.repository,
          stats: entry.stats ? { downloads: entry.stats.downloads } : { downloads: 0 },
          supportedClients: entry.supportedClients,
        };
      }

      return {
        name: entry.name,
        version: entry.latest,
        description: entry.description,
        tags: entry.tags,
        source: entry.source.type,
        sourceConfig: {
          owner,
          repo,
          path: skillPath,
          branch,
        },
        moduleType,
        author: entry.author ?? 'GitHub catalog',
        license: entry.license ?? 'See upstream repository',
        repository: entry.repository ?? (owner && repo ? `https://github.com/${owner}/${repo}` : undefined),
        stats: entry.stats ? { downloads: entry.stats.downloads } : { downloads: 0 },
        supportedClients: entry.supportedClients,
      };
    }
    try {
      return await getOfflineModuleInfo(moduleName, cwd);
    } catch {
      throw Object.assign(
        new Error(`Module "${moduleName}" not found in configured sources or local catalog`),
        {
          code: 'MODULE_NOT_FOUND',
        }
      );
    }
  }

  return getOfflineModuleInfo(moduleName, cwd);
}

/** @deprecated Use {@link getModuleInfo} (same behavior). */
export const getSkillInfo = getModuleInfo;

/** Same lookup as {@link getModuleInfo}; use for call-site clarity. */
export const getSubagentInfo = getModuleInfo;

/** Same lookup as {@link getModuleInfo}; use for call-site clarity. */
export const getHookInfo = getModuleInfo;

/** Version tags for a catalog entry (any module kind). */
export async function getModuleVersions(moduleName: string, cwd = process.cwd()): Promise<string[]> {
  const reg = await getDynamicRegistry(cwd);
  if (reg) {
    const entry = await reg.getSkill(moduleName);
    if (entry?.versions?.length) {
      const v = [...entry.versions];
      if (!v.includes('latest')) v.unshift('latest');
      return v;
    }
  }
  try {
    await getOfflineModuleInfo(moduleName, cwd);
    return ['latest'];
  } catch {
    return ['latest', '1.0.0', '0.9.0'];
  }
}

/** @deprecated Use {@link getModuleVersions} */
export const getSkillVersions = getModuleVersions;

/** Full install + client adapter apply (idempotent). */
export async function runApply(cwd: string, options?: { dryRun?: boolean; strict?: boolean }) {
  return apply({
    projectRoot: cwd,
    dryRun: options?.dryRun,
    strict: options?.strict,
    logLevel: 'info',
  });
}

/**
 * Create spec.yaml file
 */
export async function createSpecFile(data: {
  project: any;
  client: string;
  skills: string[];
  settings: any;
}): Promise<void> {
  const spec: SpecFile = {
    version: '1.0',
    project: {
      name: data.project.projectName,
      description: data.project.description,
      author: data.project.author,
    },
    client: {
      type: data.client as any,
      features: ['skills', 'rules', 'hooks'],
    },
    skills: data.skills.map(name => ({
      name,
      version: 'latest',
      source: 'github' as any,
      sourceConfig: {
        owner: NPM_PACKAGE_NAME,
        repo: 'skills',
        path: name,
      },
    })),
    modules: [],
    settings: {
      autoSync: data.settings.autoSync,
      verifyChecksums: data.settings.verifyChecksums,
      cacheDir: `~/${WORKSPACE_DOTDIR.slice(1)}/cache`,
      lockFile: `${WORKSPACE_DOTDIR}/lock.yaml`,
    },
  };
  
  const yamlContent = yaml.dump(spec, {
    indent: 2,
    lineWidth: -1,
  });
  
  await fs.writeFile('spec.yaml', yamlContent, 'utf-8');
}

function ensureSpecModuleArrays(spec: SpecFile): void {
  if (!Array.isArray(spec.skills)) spec.skills = [];
  if (!Array.isArray(spec.modules)) spec.modules = [];
}

function specModuleArray(spec: SpecFile, which: 'skills' | 'modules'): Skill[] {
  return which === 'skills' ? spec.skills : spec.modules!;
}

function findModuleRow(spec: SpecFile, name: string): { array: 'skills' | 'modules'; index: number } | null {
  ensureSpecModuleArrays(spec);
  const i = spec.skills.findIndex((s) => s.name === name);
  if (i >= 0) return { array: 'skills', index: i };
  const j = spec.modules!.findIndex((s) => s.name === name);
  if (j >= 0) return { array: 'modules', index: j };
  return null;
}

function arrayKeyForModuleType(t: AIModuleType): 'skills' | 'modules' {
  return t === 'skill' ? 'skills' : 'modules';
}

/** Keep `moduleType` implicit for plain skills under `skills:`. */
function applyModuleTypeToRow(row: Skill, t: AIModuleType, section: 'skills' | 'modules'): void {
  if (section === 'skills' && t === DEFAULT_MODULE_TYPE) {
    delete row.moduleType;
    return;
  }
  if (section === 'modules') {
    row.moduleType = t;
    return;
  }
  if (t !== DEFAULT_MODULE_TYPE) row.moduleType = t;
  else delete row.moduleType;
}

/**
 * Add or update an AI module row in `spec.yaml` (`skills` for type skill, `modules` for subagent/hook).
 */
export async function addModuleToSpec(module: {
  name: string;
  version: string;
  source: string;
  sourceConfig?: Record<string, unknown>;
  config?: any;
  moduleType?: AIModuleType;
}): Promise<void> {
  const specPath = path.join(process.cwd(), 'spec.yaml');

  if (!(await exists(specPath))) {
    throw { code: 'SPEC_NOT_FOUND', message: 'spec.yaml not found' };
  }

  const content = await fs.readFile(specPath, 'utf-8');
  const spec = yaml.load(content) as SpecFile;
  ensureSpecModuleArrays(spec);

  const requested: AIModuleType = module.moduleType ?? DEFAULT_MODULE_TYPE;
  const found = findModuleRow(spec, module.name);

  const applyFields = (row: Skill) => {
    row.version = module.version;
    row.source = module.source as Skill['source'];
    if (module.config !== undefined) row.config = module.config;
    if (module.sourceConfig) {
      row.sourceConfig = {
        ...(row.sourceConfig as Record<string, unknown> | undefined),
        ...module.sourceConfig,
      } as Skill['sourceConfig'];
    }
  };

  if (found) {
    const from = found.array;
    const arr = specModuleArray(spec, from);
    const row = arr[found.index];
    applyFields(row);

    const nextType: AIModuleType =
      module.moduleType !== undefined ? module.moduleType : (row.moduleType ?? DEFAULT_MODULE_TYPE);
    const to = arrayKeyForModuleType(nextType);

    if (from === to) {
      applyModuleTypeToRow(row, nextType, to);
    } else {
      arr.splice(found.index, 1);
      applyModuleTypeToRow(row, nextType, to);
      specModuleArray(spec, to).push(row);
    }
  } else {
    const to = arrayKeyForModuleType(requested);
    const row: Skill = {
      name: module.name,
      version: module.version,
      source: module.source as Skill['source'],
      sourceConfig: module.sourceConfig as Skill['sourceConfig'],
      config: module.config,
    };
    applyModuleTypeToRow(row, requested, to);
    specModuleArray(spec, to).push(row);
  }

  const yamlContent = yaml.dump(spec, {
    indent: 2,
    lineWidth: -1,
  });

  await fs.writeFile(specPath, yamlContent, 'utf-8');
}

/** @deprecated Use {@link addModuleToSpec} */
export const addSkillToSpec = addModuleToSpec;

/**
 * Remove a module by name from either `skills` or `modules`.
 */
export async function removeModuleFromSpec(moduleName: string): Promise<void> {
  const specPath = path.join(process.cwd(), 'spec.yaml');

  if (!(await exists(specPath))) {
    throw { code: 'SPEC_NOT_FOUND', message: 'spec.yaml not found' };
  }

  const content = await fs.readFile(specPath, 'utf-8');
  const spec = yaml.load(content) as SpecFile;
  ensureSpecModuleArrays(spec);

  spec.skills = spec.skills.filter((s) => s.name !== moduleName);
  spec.modules = spec.modules!.filter((s) => s.name !== moduleName);

  const yamlContent = yaml.dump(spec, {
    indent: 2,
    lineWidth: -1,
  });

  await fs.writeFile(specPath, yamlContent, 'utf-8');
}

/** @deprecated Use {@link removeModuleFromSpec} */
export const removeSkillFromSpec = removeModuleFromSpec;

/**
 * Read and validate spec.yaml (current working directory).
 */
export async function readSpec(): Promise<SpecFile> {
  return loadSpec(process.cwd());
}

/**
 * Validate spec.yaml
 */
export async function validateSpecFile(): Promise<{ valid: boolean; errors?: any[] }> {
  try {
    await readSpec();
    return { valid: true };
  } catch (error: any) {
    if (error.code === 'VALIDATION_ERROR') {
      return { valid: false, errors: error.errors };
    }
    throw error;
  }
}

/**
 * Helper types
 */

export interface InstallResult {
  installed: number;
  updated: number;
  skipped: number;
  errors?: string[];
}

export interface ApplyResult {
  applied: number;
  errors?: string[];
}

/**
 * Helper: Check if path exists
 */
async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}
