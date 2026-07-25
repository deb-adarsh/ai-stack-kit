/**
 * Assembles {@link NormalizedWorkspaceInput} from spec + fetched module payloads.
 * Modules (skills, subagents, hooks) are passed through as authored — no derivation.
 */

import type { SpecFile } from '../types/spec.js';
import type { NormalizedWorkspaceInput, ResolvedSkill, WorkspaceMetadata } from './normalized.js';

export interface NormalizeOptions {
  engineVersion?: string;
}

/**
 * Build adapter input: each resolved module keeps its fetched files and `moduleType`.
 */
export function normalizeWorkspaceInput(
  spec: SpecFile,
  resolved: Array<{
    id: string;
    name: string;
    version: string;
    description?: string;
    files: Record<string, string>;
    manifest?: import('../types/skill.js').SkillManifest | null;
    tags?: string[];
    supportedClients?: string[];
    metadata?: Record<string, unknown>;
  }>,
  options: NormalizeOptions = {}
): NormalizedWorkspaceInput {
  const modules: ResolvedSkill[] = resolved.map((r) => ({
    id: r.id,
    name: r.name,
    version: r.version,
    description: r.description ?? r.manifest?.description,
    files: r.files,
    manifest: r.manifest ?? null,
    tags: r.tags ?? r.manifest?.tags,
    supportedClients: r.supportedClients ?? r.manifest?.supportedClients,
    metadata: r.metadata,
  }));

  const metadata: WorkspaceMetadata = {
    specVersion: spec.version,
    generatedAt: new Date().toISOString(),
    projectName: spec.project?.name,
    engineVersion: options.engineVersion,
  };

  return {
    modules,
    metadata,
    client: spec.client,
    spec: {
      version: spec.version,
      project: spec.project,
      settings: spec.settings,
      metadata: spec.metadata,
      hooks: spec.hooks,
    },
  };
}
