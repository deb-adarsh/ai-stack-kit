/**
 * Declarative skill catalog sources (`sources.config.yaml`).
 * Registry aggregates these connectors — skills are never hand-maintained in JSON.
 */

import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';

const AnySourceEntry = z
  .object({
    type: z.string(),
  })
  .passthrough();

/** Validates a single GitHub tree source row from `sources.config.yaml`. */
export const GithubSourceEntrySchema = z.object({
  type: z.literal('github'),
  id: z.string().min(1).optional(),
  repo: z.string().regex(/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i),
  path: z.string().optional(),
  branch: z.string().optional(),
  /** Max raw.githubusercontent fetches for this repo (overrides global default). */
  enrichMax: z.number().min(0).max(2000).optional(),
  /** Set false to skip per-folder description enrichment. */
  enrich: z.boolean().optional(),
  /** Default `skill`; set `subagent` or `hook` for alternate manifests under the same tree layout. */
  moduleType: z.enum(['skill', 'subagent', 'hook']).optional(),
});

/** npm package that contains a `skills/` (or custom) tree inside the published tarball. */
export const NpmSourceEntrySchema = z.object({
  type: z.literal('npm'),
  id: z.string().min(1).optional(),
  /** Full package name, e.g. `@scope/skills` or `lodash` */
  package: z.string().min(1),
  registryUrl: z.string().url().optional(),
  /** dist-tag or semver range (default `latest`) */
  version: z.string().optional(),
  /** Directory inside the package tarball (default `skills`) */
  path: z.string().optional(),
  moduleType: z.enum(['skill', 'subagent', 'hook']).optional(),
});

const SourcesConfigSchema = z.object({
  version: z.number().int().optional(),
  cacheTtlSeconds: z.number().min(60).max(86400 * 7).default(3600),
  /** Relative to cwd; default `.cache/aistack` */
  cacheDir: z.string().optional(),
  /** Default cap on raw GitHub metadata fetches per source per refresh. */
  githubMetadataEnrichMax: z.number().min(0).max(2000).default(120),
  githubMetadataEnrichConcurrency: z.number().min(1).max(32).default(8),
  sources: z.array(AnySourceEntry),
});

export type GithubSourceConfig = z.infer<typeof GithubSourceEntrySchema>;
export type NpmSourceConfig = z.infer<typeof NpmSourceEntrySchema>;
export type SourcesConfigFile = z.infer<typeof SourcesConfigSchema>;

export function resolveSourcesConfigPath(cwd: string): string {
  const env =
    process.env.AISTACK_SOURCES_CONFIG?.trim() || process.env.SPEC_ENGINE_SOURCES_CONFIG?.trim();
  if (env) return path.isAbsolute(env) ? env : path.resolve(cwd, env);
  return path.join(cwd, 'sources.config.yaml');
}

/** Slug for default catalog id when `id` omitted */
export function defaultCatalogId(repo: string): string {
  return repo.replace(/\//g, '-').toLowerCase();
}

export async function loadSourcesConfigFromProject(cwd: string): Promise<SourcesConfigFile | null> {
  const p = resolveSourcesConfigPath(cwd);
  try {
    const raw = await readFile(p, 'utf-8');
    const doc = yaml.load(raw) as unknown;
    return SourcesConfigSchema.parse(doc);
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err?.code === 'ENOENT') return null;
    throw e;
  }
}
