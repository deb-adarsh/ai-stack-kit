/**
 * Partition resolved modules by `moduleType` for client-specific output dirs.
 */

import type { AdapterOutputFile } from './adapter-output.js';
import type { ResolvedSkill } from './normalized.js';
import { resolvedModuleType } from './normalized.js';

export function sanitizePathSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

/** GitHub Copilot agent files: basename before `.agent.md` allows only `.\-_a-zA-Z0-9`. */
export function copilotAgentBasename(agentId: string): string {
  const s = agentId.replace(/[^.\-_a-zA-Z0-9]/g, '-').replace(/^[\-.]+|[\-.]+$/g, '');
  return s || 'agent';
}

export function moduleInstallFolderName(module: ResolvedSkill): string {
  const raw = module.manifest?.name ?? module.name ?? module.id;
  return sanitizePathSegment(raw);
}

/** @deprecated Use {@link partitionModulesByType}. */
export function partitionSkillsAndHooks(modules: ResolvedSkill[]): {
  skillLike: ResolvedSkill[];
  hooks: ResolvedSkill[];
} {
  const { skills, subagents, hooks } = partitionModulesByType(modules);
  return { skillLike: [...skills, ...subagents], hooks };
}

/** Route each spec module to skills, subagents, or hooks output trees. */
export function partitionModulesByType(modules: ResolvedSkill[]): {
  skills: ResolvedSkill[];
  subagents: ResolvedSkill[];
  hooks: ResolvedSkill[];
} {
  const skills: ResolvedSkill[] = [];
  const subagents: ResolvedSkill[] = [];
  const hooks: ResolvedSkill[] = [];
  for (const m of modules) {
    switch (resolvedModuleType(m)) {
      case 'hook':
        hooks.push(m);
        break;
      case 'subagent':
        subagents.push(m);
        break;
      default:
        skills.push(m);
        break;
    }
  }
  return { skills, subagents, hooks };
}

/** @deprecated Use {@link moduleInstallFolderName}. */
export const skillInstallFolderName = moduleInstallFolderName;

/** Copy fetched package files into a client directory, one folder per module. */
export function emitModuleTreeFiles(
  modules: ResolvedSkill[],
  relativeDir: string
): AdapterOutputFile[] {
  const out: AdapterOutputFile[] = [];
  for (const mod of modules) {
    const folder = moduleInstallFolderName(mod);
    for (const [relPath, content] of Object.entries(mod.files)) {
      const safeRel = relPath
        .replace(/^[/\\]+/, '')
        .replace(/\\/g, '/')
        .split('/')
        .filter((p) => p && p !== '..')
        .join('/');
      if (!safeRel) continue;
      out.push({
        path: `${relativeDir}/${folder}/${safeRel}`,
        content,
        mergeStrategy: 'overwrite',
        managed: true,
      });
    }
  }
  return out;
}

/** @deprecated Use {@link emitModuleTreeFiles}. */
export const emitSkillTreeFiles = emitModuleTreeFiles;

/** Hook packs (`hook.json`, scripts, etc.) under client hooks directories. */
export function emitHookTreeFiles(hooks: ResolvedSkill[], hooksRelativeDir: string): AdapterOutputFile[] {
  return emitModuleTreeFiles(hooks, hooksRelativeDir);
}

/** Subagent packages under client agents directories (files preserved as authored). */
export function emitSubagentTreeFiles(
  subagents: ResolvedSkill[],
  agentsRelativeDir: string
): AdapterOutputFile[] {
  return emitModuleTreeFiles(subagents, agentsRelativeDir);
}

export function cursorStyleAgentBasename(agentId: string): string {
  return sanitizePathSegment(agentId);
}
