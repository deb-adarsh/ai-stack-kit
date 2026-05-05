/**
 * Emit resolved skill folders (e.g. SKILL.md + assets) and agent markdown files
 * into client-specific directories.
 */

import type { AdapterOutputFile } from './adapter-output.js';
import type { AgentDefinition, ResolvedSkill } from './normalized.js';
import { resolvedModuleType } from './normalized.js';

export function sanitizePathSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

/** GitHub Copilot agent files: basename before `.agent.md` allows only `.\-_a-zA-Z0-9`. */
export function copilotAgentBasename(agentId: string): string {
  const s = agentId.replace(/[^.\-_a-zA-Z0-9]/g, '-').replace(/^[\-.]+|[\-.]+$/g, '');
  return s || 'agent';
}

export function skillInstallFolderName(skill: ResolvedSkill): string {
  const raw = skill.manifest?.name ?? skill.name ?? skill.id;
  return sanitizePathSegment(raw);
}

/** Split hook modules from skills/subagents for client-specific hook directories. */
export function partitionSkillsAndHooks(skills: ResolvedSkill[]): {
  skillLike: ResolvedSkill[];
  hooks: ResolvedSkill[];
} {
  const skillLike: ResolvedSkill[] = [];
  const hooks: ResolvedSkill[] = [];
  for (const s of skills) {
    if (resolvedModuleType(s) === 'hook') hooks.push(s);
    else skillLike.push(s);
  }
  return { skillLike, hooks };
}

/** One folder per module under `skillsRelativeDir`, preserving package-relative paths. */
export function emitSkillTreeFiles(
  skills: ResolvedSkill[],
  skillsRelativeDir: string
): AdapterOutputFile[] {
  const out: AdapterOutputFile[] = [];
  for (const skill of skills) {
    const folder = skillInstallFolderName(skill);
    for (const [relPath, content] of Object.entries(skill.files)) {
      const safeRel = relPath.replace(/^[/\\]+/, '').replace(/\\/g, '/').split('/').filter((p) => p && p !== '..').join('/');
      if (!safeRel) continue;
      out.push({
        path: `${skillsRelativeDir}/${folder}/${safeRel}`,
        content,
        mergeStrategy: 'overwrite',
        managed: true,
      });
    }
  }
  return out;
}

/** Hook packs (`hook.json`, scripts, etc.) under `.cursor/hooks`, `.claude/hooks`, `.github/hooks`, … */
export function emitHookTreeFiles(hooks: ResolvedSkill[], hooksRelativeDir: string): AdapterOutputFile[] {
  return emitSkillTreeFiles(hooks, hooksRelativeDir);
}

export function cursorStyleAgentBasename(agentId: string): string {
  return sanitizePathSegment(agentId);
}
