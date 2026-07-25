/**
 * Workspace model passed to client adapters.
 * Each module is fetched from its source and written to the matching client directory.
 */

import type { ClientConfig, SpecFile } from '../types/spec.js';
import type { SkillManifest } from '../types/skill.js';
import type { AIModuleType } from '../types/ai-module.js';
import { DEFAULT_MODULE_TYPE } from '../types/ai-module.js';

/** Fetched module payload — files preserved as authored in the source package. */
export interface ResolvedSkill {
  id: string;
  name: string;
  version: string;
  description?: string;
  /** Text files from the module package (relative path → content). */
  files: Record<string, string>;
  manifest?: SkillManifest | null;
  tags?: string[];
  supportedClients?: string[];
  metadata?: Record<string, unknown>;
}

/** Module kind from spec/catalog (`metadata.moduleType`); defaults to skill. */
export function resolvedModuleType(module: ResolvedSkill): AIModuleType {
  const mt = module.metadata?.moduleType;
  if (mt === 'skill' || mt === 'subagent' || mt === 'hook') return mt;
  return DEFAULT_MODULE_TYPE;
}

/** Run-wide metadata (project, engine version, trace). */
export interface WorkspaceMetadata {
  specVersion: string;
  generatedAt: string;
  projectName?: string;
  engineVersion?: string;
  extra?: Record<string, unknown>;
}

/** Input to every {@link ClientAdapter} — pass-through modules + client config. */
export interface NormalizedWorkspaceInput {
  /** All resolved modules from spec (skills, subagents, hooks). */
  modules: ResolvedSkill[];
  metadata: WorkspaceMetadata;
  client: ClientConfig;
  spec: Pick<SpecFile, 'version' | 'project' | 'settings' | 'metadata' | 'hooks'>;
}

/** @deprecated Use {@link ResolvedSkill} and {@link NormalizedWorkspaceInput.modules}. */
export type AgentDefinition = {
  id: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  instructions?: string[];
  promptIds?: string[];
  toolIds?: string[];
  tags?: string[];
  sourceSkillId?: string;
  metadata?: Record<string, unknown>;
};

/** @deprecated Prompt derivation removed — prompts are not synthesized from skills. */
export type NormalizedPrompt = {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool' | 'instruction';
  title: string;
  body: string;
  variables?: string[];
  tags?: string[];
  sourceSkillId?: string;
  metadata?: Record<string, unknown>;
};

/** @deprecated Tool derivation removed. */
export type ToolDefinition = {
  id: string;
  name: string;
  description?: string;
  invokerKind: 'mcp' | 'http' | 'cli' | 'builtin' | 'unknown';
  schema?: Record<string, unknown> | string;
  config?: Record<string, unknown>;
  sourceSkillId?: string;
  metadata?: Record<string, unknown>;
};
