/**
 * Cursor: skills → `.cursor/skills/{name}/`, subagents → `.cursor/agents/{name}/`, hooks → `.cursor/hooks/{name}/`.
 * Same layout under `~/.cursor/` when `client.installScope: user`. Files are copied as authored.
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
  moduleInstallFolderName,
  partitionModulesByType,
} from '../emit-skill-agent-files.js';
import type { NormalizedWorkspaceInput } from '../normalized.js';
import { WORKSPACE_DOTDIR } from '../../branding.js';

export class CursorClientAdapter extends BaseClientAdapter {
  readonly name = 'cursor';

  supports(clientType: string): boolean {
    return clientType === 'cursor';
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

    files.push({
      path: `${WORKSPACE_DOTDIR}/manifest.cursor.json`,
      pathAnchor: 'project',
      content:
        JSON.stringify(
          {
            version: 2,
            generatedAt: input.metadata.generatedAt,
            installScope: scope,
            skills: skills.map((s) => ({
              id: s.id,
              name: s.name,
              version: s.version,
              path: `${skillsRel}/${moduleInstallFolderName(s)}`,
            })),
            subagents: subagents.map((a) => ({
              id: a.id,
              name: a.name,
              version: a.version,
              path: `${agentsRel}/${moduleInstallFolderName(a)}`,
            })),
            hooks: hooks.map((h) => ({
              id: h.id,
              name: h.name,
              version: h.version,
              path: `${hooksRel}/${moduleInstallFolderName(h)}`,
            })),
          },
          null,
          2
        ) + '\n',
      mergeStrategy: 'overwrite',
      managed: true,
    });

    return { files };
  }
}
