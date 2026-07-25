/**
 * Claude: skills → `.claude/skills/{name}/`, subagents → `.claude/agents/{name}/`, hooks → `.claude/hooks/{name}/`.
 * Same under `~/.claude/` when `client.installScope: user`. Files are copied as authored.
 */

import type { AdapterOutput, AdapterOutputFile } from '../adapter-output.js';
import { BaseClientAdapter } from '../base-client-adapter.js';
import {
  agentsDirRelative,
  hooksDirRelative,
  resolveInstallScope,
  skillsDirRelative,
} from '../client-paths.js';
import {
  emitHookTreeFiles,
  emitModuleTreeFiles,
  emitSubagentTreeFiles,
  partitionModulesByType,
} from '../emit-skill-agent-files.js';
import type { NormalizedWorkspaceInput } from '../normalized.js';

export class ClaudeClientAdapter extends BaseClientAdapter {
  readonly name = 'claude';

  supports(clientType: string): boolean {
    return clientType === 'claude';
  }

  generateConfig(input: NormalizedWorkspaceInput): AdapterOutput {
    const scope = resolveInstallScope(input.client);
    const skillsRel = skillsDirRelative(input.client.type, scope);
    const agentsRel = agentsDirRelative(input.client.type, scope);
    const hooksRel = hooksDirRelative(input.client.type, scope);
    const { skills, subagents, hooks } = partitionModulesByType(input.modules);

    const files: AdapterOutputFile[] = [
      ...emitModuleTreeFiles(skills, skillsRel),
      ...emitSubagentTreeFiles(subagents, agentsRel),
      ...emitHookTreeFiles(hooks, hooksRel),
    ];

    return { files };
  }
}
