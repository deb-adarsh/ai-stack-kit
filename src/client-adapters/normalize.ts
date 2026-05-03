/**
 * Builds {@link NormalizedWorkspaceInput} from spec + resolved skill payloads.
 * Keeps all skill-shape knowledge here — adapters stay decoupled.
 */

import type { SpecFile } from '../types/spec.js';
import type { SkillManifest } from '../types/skill.js';
import type {
  AgentDefinition,
  NormalizedPrompt,
  NormalizedWorkspaceInput,
  ResolvedSkill,
  ToolDefinition,
  WorkspaceMetadata,
} from './normalized.js';

export interface NormalizeOptions {
  engineVersion?: string;
}

function extractPromptsFromSkill(
  skillId: string,
  files: Record<string, string>,
  manifest?: SkillManifest | null
): NormalizedPrompt[] {
  const prompts: NormalizedPrompt[] = [];

  const skillMd = files['SKILL.md'] ?? files['skill.md'];
  if (skillMd) {
    prompts.push({
      id: `${skillId}:skill-md`,
      role: 'instruction',
      title: `${skillId} — SKILL`,
      body: skillMd,
      sourceSkillId: skillId,
    });
  }

  if (manifest?.description) {
    prompts.push({
      id: `${skillId}:manifest-summary`,
      role: 'system',
      title: `${manifest.name} summary`,
      body: manifest.description,
      sourceSkillId: skillId,
    });
  }

  return prompts;
}

function toolsFromManifest(skillId: string, manifest?: SkillManifest | null): ToolDefinition[] {
  if (!manifest?.dependencies) return [];
  return Object.entries(manifest.dependencies).map(([name, version]) => ({
    id: `${skillId}:dep:${name}`,
    name,
    description: `Dependency ${name}@${version}`,
    invokerKind: 'unknown' as const,
    sourceSkillId: skillId,
  }));
}

function agentFromSkill(skill: ResolvedSkill): AgentDefinition {
  const m = skill.manifest;
  return {
    id: `agent:${skill.id}`,
    name: m?.name ?? skill.name,
    description: m?.description ?? skill.description,
    systemPrompt: m?.description ?? skill.description,
    instructions: undefined,
    promptIds: skill.prompts.map((p) => p.id),
    toolIds: skill.tools.map((t) => t.id),
    sourceSkillId: skill.id,
    tags: m?.tags ?? skill.tags,
  };
}

/**
 * Normalize spec + per-skill file maps into the cross-client workspace model.
 */
export function normalizeWorkspaceInput(
  spec: SpecFile,
  resolved: Array<{
    id: string;
    name: string;
    version: string;
    description?: string;
    files: Record<string, string>;
    manifest?: SkillManifest | null;
    tags?: string[];
    supportedClients?: string[];
    metadata?: Record<string, unknown>;
  }>,
  options: NormalizeOptions = {}
): NormalizedWorkspaceInput {
  const skills: ResolvedSkill[] = resolved.map((r) => {
    const prompts = extractPromptsFromSkill(r.id, r.files, r.manifest);
    const tools = toolsFromManifest(r.id, r.manifest);
    return {
      id: r.id,
      name: r.name,
      version: r.version,
      description: r.description ?? r.manifest?.description,
      files: r.files,
      manifest: r.manifest ?? null,
      prompts,
      tools,
      tags: r.tags ?? r.manifest?.tags,
      supportedClients: r.supportedClients ?? r.manifest?.supportedClients,
      metadata: r.metadata,
    };
  });

  const prompts = skills.flatMap((s) => s.prompts);
  const tools = skills.flatMap((s) => s.tools);
  const agents = skills.map(agentFromSkill);

  const metadata: WorkspaceMetadata = {
    specVersion: spec.version,
    generatedAt: new Date().toISOString(),
    projectName: spec.project?.name,
    engineVersion: options.engineVersion,
  };

  return {
    skills,
    agents,
    prompts,
    tools,
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
