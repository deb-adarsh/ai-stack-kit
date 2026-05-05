/**
 * Normalized workspace model — sole bridge between spec/skills and client adapters.
 * Adapters MUST consume only this shape (never raw skill archives or client-specific types).
 */

import type { ClientConfig, SpecFile } from '../types/spec.js';
import type { SkillManifest } from '../types/skill.js';
import type { AIModuleType } from '../types/ai-module.js';
import { DEFAULT_MODULE_TYPE } from '../types/ai-module.js';

/** Declarative prompt block (templates, variables, roles). */
export interface NormalizedPrompt {
  id: string;
  /** Logical role for orchestration (not client-specific). */
  role: 'system' | 'user' | 'assistant' | 'tool' | 'instruction';
  /** Human title for UIs / docs. */
  title: string;
  /** Prompt body; may contain `{{variable}}` placeholders. */
  body: string;
  /** Variable names referenced in `body`. */
  variables?: string[];
  tags?: string[];
  /** Provenance: which skill id (if any) produced this prompt. */
  sourceSkillId?: string;
  metadata?: Record<string, unknown>;
}

/** Tool / capability exposed to agents (MCP, HTTP, CLI, etc.). */
export interface ToolDefinition {
  id: string;
  name: string;
  description?: string;
  /** How the tool is invoked in the abstract sense. */
  invokerKind: 'mcp' | 'http' | 'cli' | 'builtin' | 'unknown';
  /** JSON-serializable schema or URI reference string. */
  schema?: Record<string, unknown> | string;
  /** Optional binding hints (normalized, not Cursor/Claude specific). */
  config?: Record<string, unknown>;
  sourceSkillId?: string;
  metadata?: Record<string, unknown>;
}

/** Agent persona: orchestrates prompts + tools. */
export interface AgentDefinition {
  id: string;
  name: string;
  description?: string;
  /** High-level system / developer instructions. */
  systemPrompt?: string;
  /** Ordered instruction steps or sub-prompt ids. */
  instructions?: string[];
  /** Prompt ids this agent uses by default. */
  promptIds?: string[];
  /** Tool ids available to this agent. */
  toolIds?: string[];
  tags?: string[];
  sourceSkillId?: string;
  metadata?: Record<string, unknown>;
}

/** Skill after resolution + extraction — client-agnostic. */
export interface ResolvedSkill {
  id: string;
  name: string;
  version: string;
  description?: string;
  /** Text files from the skill package (relative path → content). */
  files: Record<string, string>;
  manifest?: SkillManifest | null;
  /** Prompts extracted or derived from manifest / SKILL.md sections. */
  prompts: NormalizedPrompt[];
  /** Tools declared in manifest or conventions. */
  tools: ToolDefinition[];
  tags?: string[];
  supportedClients?: string[];
  metadata?: Record<string, unknown>;
}

/** Module kind from spec/catalog (`metadata.moduleType`); defaults to skill. */
export function resolvedModuleType(skill: ResolvedSkill): AIModuleType {
  const mt = skill.metadata?.moduleType;
  if (mt === 'skill' || mt === 'subagent' || mt === 'hook') return mt;
  return DEFAULT_MODULE_TYPE;
}

/** Run-wide metadata (project, engine version, trace). */
export interface WorkspaceMetadata {
  specVersion: string;
  generatedAt: string;
  projectName?: string;
  /** Engine / CLI version writing this bundle. */
  engineVersion?: string;
  extra?: Record<string, unknown>;
}

/**
 * Common input to every {@link ClientAdapter}.
 * Built by a normalizer: `SpecFile` + `ResolvedSkill[]` → this shape.
 */
export interface NormalizedWorkspaceInput {
  skills: ResolvedSkill[];
  agents: AgentDefinition[];
  prompts: NormalizedPrompt[];
  tools: ToolDefinition[];
  metadata: WorkspaceMetadata;
  client: ClientConfig;
  /** Slim spec slice for adapter context (no raw skill list duplication). */
  spec: Pick<SpecFile, 'version' | 'project' | 'settings' | 'metadata' | 'hooks'>;
}
