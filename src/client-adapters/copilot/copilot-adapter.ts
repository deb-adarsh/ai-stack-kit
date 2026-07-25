/**
 * GitHub Copilot: skills → `.github/skills/` (project) or `~/.copilot/skills/` (user);
 * subagents → `.github/agents/` or `~/.copilot/agents/`; hooks → `.github/hooks/` or `~/.copilot/hooks/`.
 * Module files are copied as authored (including `.agent.md` where present).
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
import { loadBundledTemplate, renderTemplate } from '../template-loader.js';
import { VSCODE_SETTINGS_ROOT_KEY, WORKSPACE_DOTDIR } from '../../branding.js';

export class CopilotClientAdapter extends BaseClientAdapter {
  readonly name = 'copilot';

  supports(clientType: string): boolean {
    return clientType === 'copilot';
  }

  generateConfig(input: NormalizedWorkspaceInput): AdapterOutput {
    const scope = resolveInstallScope(input.client);
    const skillsRel = skillsDirRelative(input.client.type, scope);
    const agentsRel = agentsDirRelative(input.client.type, scope);
    const hooksRel = hooksDirRelative(input.client.type, scope);
    const { skills, subagents, hooks } = partitionModulesByType(input.modules);

    const patch = {
      [VSCODE_SETTINGS_ROOT_KEY]: {
        copilot: {
          version: 3,
          generatedAt: input.metadata.generatedAt,
          installScope: scope,
          skillsDir: skillsRel,
          agentsDir: agentsRel,
          hooksDir: hooksRel,
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
      },
    };

    const files: AdapterOutputFile[] = [
      ...emitModuleTreeFiles(skills, skillsRel),
      ...emitSubagentTreeFiles(subagents, agentsRel),
      ...emitHookTreeFiles(hooks, hooksRel),
      {
        path: '.vscode/settings.json',
        pathAnchor: 'project',
        content: JSON.stringify(patch, null, 2) + '\n',
        mergeStrategy: 'merge',
        managed: false,
      },
    ];

    const tpl = loadBundledTemplate('copilot', 'instructions.md.tpl');
    const instructions = tpl
      ? renderTemplate(tpl, {
          skillCount: String(skills.length),
          agentCount: String(subagents.length),
          skillsDir: skillsRel,
          agentsDir: agentsRel,
          hooksDir: hooksRel,
        })
      : [
          '# GitHub Copilot + AI Stack Kit',
          '',
          `Skills sync under **${skillsRel}/** (each folder contains authored skill files such as \`SKILL.md\`).`,
          `Subagents sync under **${agentsRel}/** (files preserved as authored, including \`.agent.md\` when present).`,
          `Hook packs sync under **${hooksRel}/**.`,
          '',
        ].join('\n');

    files.push({
      path: `${WORKSPACE_DOTDIR}/copilot/INSTRUCTIONS.md`,
      pathAnchor: 'project',
      content: instructions,
      mergeStrategy: 'overwrite',
      managed: true,
    });

    return { files };
  }
}
