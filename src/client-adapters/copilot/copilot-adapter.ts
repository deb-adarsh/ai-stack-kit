/**
 * GitHub Copilot (VS Code): skills under `.github/skills/` (project) or `~/.copilot/skills/` (user);
 * hook packs under `.github/hooks/{hook}/` or `~/.copilot/hooks/` (aligned with layouts such as [awesome-copilot/hooks](https://github.com/github/awesome-copilot/tree/main/hooks));
 * subagents as `.github/agents/*.agent.md` or `~/.copilot/agents/*.agent.md` — **only Copilot** uses the
 * `*.agent.md` suffix. Merges snippets into `.vscode/settings.json` under `aistack` (project root only).
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
  copilotAgentBasename,
  emitHookTreeFiles,
  emitSkillTreeFiles,
  partitionSkillsAndHooks,
  skillInstallFolderName,
} from '../emit-skill-agent-files.js';
import type { NormalizedWorkspaceInput } from '../normalized.js';
import { loadBundledTemplate, renderTemplate } from '../template-loader.js';
import { VSCODE_SETTINGS_ROOT_KEY, WORKSPACE_DOTDIR } from '../../branding.js';

function copilotAgentBody(agent: {
  name: string;
  description?: string;
  systemPrompt?: string;
}): string {
  return [
    `# ${agent.name}`,
    '',
    agent.description ?? '',
    '',
    '## Instructions',
    '',
    agent.systemPrompt ?? '_No system prompt._',
    '',
  ].join('\n');
}

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
    const { skillLike, hooks } = partitionSkillsAndHooks(input.skills);

    const snippets: Record<string, string> = {};
    for (const p of input.prompts) {
      snippets[p.id] = p.body;
    }

    const patch = {
      [VSCODE_SETTINGS_ROOT_KEY]: {
        copilot: {
          version: 2,
          generatedAt: input.metadata.generatedAt,
          installScope: scope,
          skillsDir: skillsRel,
          agentsDir: agentsRel,
          hooksDir: hooksRel,
          skills: skillLike.map((s) => ({ id: s.id, name: s.name, version: s.version })),
          hooks: hooks.map((h) => ({
            id: h.id,
            name: h.name,
            version: h.version,
            path: `${hooksRel}/${skillInstallFolderName(h)}`,
          })),
          agents: input.agents.map((a) => ({
            id: a.id,
            name: a.name,
            path: `${agentsRel}/${copilotAgentBasename(a.id)}.agent.md`,
          })),
          promptSnippets: snippets,
        },
      },
    };

    const files: AdapterOutputFile[] = [
      ...emitSkillTreeFiles(skillLike, skillsRel),
      ...emitHookTreeFiles(hooks, hooksRel),
      ...input.agents.map((a) => ({
        path: `${agentsRel}/${copilotAgentBasename(a.id)}.agent.md`,
        content: copilotAgentBody(a),
        mergeStrategy: 'overwrite' as const,
        managed: true as const,
      })),
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
          skillCount: String(skillLike.length),
          agentCount: String(input.agents.length),
          skillsDir: skillsRel,
          agentsDir: agentsRel,
          hooksDir: hooksRel,
        })
      : [
          '# GitHub Copilot + AI Stack Kit',
          '',
          `Skills are synced under **${skillsRel}/** (each skill folder contains \`SKILL.md\` and assets).`,
          `Agents use Copilot’s **\`.agent.md\`** convention under **${agentsRel}/**.`,
          `Lifecycle hook packs (e.g. \`hook.json\` + scripts) sync under **${hooksRel}/**.`,
          '',
          'Snippet bodies are also mirrored under `aistack.copilot.promptSnippets` in `.vscode/settings.json`.',
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
