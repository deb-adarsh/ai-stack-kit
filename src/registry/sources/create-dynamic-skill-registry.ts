/**
 * Builds a composite {@link RegistryProvider} from `sources.config.yaml`
 * (GitHub tree catalogs + npm package trees).
 */

import type { RegistryProvider } from '../discovery/registry-provider.js';
import { DefaultRegistry } from '../discovery/default-registry.js';
import {
  defaultCatalogId,
  GithubSourceEntrySchema,
  loadSourcesConfigFromProject,
  NpmSourceEntrySchema,
} from './load-sources-config.js';
import { catalogCacheFilePath, GitHubTreeSkillsProvider } from './github-tree-skills-provider.js';
import {
  NpmTreeSkillsProvider,
  npmCatalogCacheFilePath,
  resolveNpmPackageForTree,
} from './npm-tree-skills-provider.js';
import { DEFAULT_MODULE_TYPE } from '../../types/ai-module.js';

/**
 * When `sources.config.yaml` exists and defines at least one supported source,
 * returns a registry that aggregates them (cached listings per source).
 */
export async function createDynamicSkillRegistry(cwd: string): Promise<RegistryProvider | null> {
  const cfg = await loadSourcesConfigFromProject(cwd);
  if (!cfg?.sources?.length) return null;

  const providers: RegistryProvider[] = [];
  const token = process.env.GITHUB_TOKEN;
  const fetchImpl = fetch;

  for (const src of cfg.sources) {
    const gh = GithubSourceEntrySchema.safeParse(src);
    if (gh.success) {
      const s = gh.data;
      const [owner, ...rest] = s.repo.split('/');
      const repo = rest.join('/');
      if (!owner || !repo) continue;
      const catalogId = s.id?.trim() || defaultCatalogId(s.repo);
      const skillsPath = s.path ?? 'skills';
      const branch = s.branch ?? 'main';
      const cacheFile = catalogCacheFilePath(cwd, cfg.cacheDir, owner, repo, skillsPath, branch);
      const enrichMax = s.enrichMax ?? cfg.githubMetadataEnrichMax;
      const enrichOn = s.enrich !== false;
      const moduleType = s.moduleType ?? DEFAULT_MODULE_TYPE;
      providers.push(
        new GitHubTreeSkillsProvider({
          catalogId,
          owner,
          repo,
          skillsPath,
          branch,
          token,
          cacheTtlSeconds: cfg.cacheTtlSeconds,
          cacheFilePath: cacheFile,
          enrichDescriptions: enrichOn,
          metadataEnrichMax: enrichMax,
          metadataEnrichConcurrency: cfg.githubMetadataEnrichConcurrency,
          moduleType,
        })
      );
      continue;
    }

    const npm = NpmSourceEntrySchema.safeParse(src);
    if (npm.success) {
      const s = npm.data;
      const catalogId = s.id?.trim() || defaultCatalogId(s.package);
      const registryUrl = (s.registryUrl ?? 'https://registry.npmjs.org').replace(/\/$/, '');
      const skillsPath = s.path ?? 'skills';
      try {
        const { resolvedVersion, tarballUrl } = await resolveNpmPackageForTree(
          s.package,
          registryUrl,
          s.version,
          fetchImpl
        );
        const cacheFile = npmCatalogCacheFilePath(cwd, cfg.cacheDir, s.package, resolvedVersion, skillsPath);
        const moduleType = s.moduleType ?? DEFAULT_MODULE_TYPE;
        providers.push(
          new NpmTreeSkillsProvider({
            catalogId,
            packageName: s.package,
            registryUrl,
            resolvedVersion,
            tarballUrl,
            skillsPath,
            cacheTtlSeconds: cfg.cacheTtlSeconds,
            cacheFilePath: cacheFile,
            fetchImpl,
            moduleType,
          })
        );
      } catch {
        /* skip broken npm source */
      }
    }
  }

  if (!providers.length) return null;
  return new DefaultRegistry(providers);
}
