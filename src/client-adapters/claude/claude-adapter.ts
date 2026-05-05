/**
 * Claude: skills under `.claude/skills/{skill}/`, hook packs under `.claude/hooks/{hook}/`,
 * subagents under `.claude/agents/*.md` (not `.agent.md`), prompts under `.claude/prompts/*.md`.
 * Same under `~/.claude/` when `client.installScope: user`.
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
  cursorStyleAgentBasename,
  emitHookTreeFiles,
  emitSkillTreeFiles,
  partitionSkillsAndHooks,
  sanitizePathSegment,
} from '../emit-skill-agent-files.js';
import type { NormalizedWorkspaceInput } from '../normalized.js';
import { loadBundledTemplate, renderTemplate } from '../template-loader.js';

function agentMarkdown(agent: {
  name: string;
  description?: string;
  systemPrompt?: string;
  promptIds?: string[];
  toolIds?: string[];
}): string {
  const promptIds = agent.promptIds ?? [];
  const toolIds = agent.toolIds ?? [];
  return [
    `# ${agent.name}`,
    '',
    agent.description ?? '',
    '',
    '## System',
    agent.systemPrompt ?? '_No system prompt._',
    '',
    '## Linked prompts',
    promptIds.length ? promptIds.map((id) => `- \`${id}\``).join('\n') : '_None_',
    '',
    '## Tools',
    toolIds.length ? toolIds.map((id) => `- \`${id}\``).join('\n') : '_None_',
    '',
  ].join('\n');
}

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
    const { skillLike, hooks } = partitionSkillsAndHooks(input.skills);

    const files: AdapterOutputFile[] = [
      ...emitSkillTreeFiles(skillLike, skillsRel),
      ...emitHookTreeFiles(hooks, hooksRel),
    ];

    const systemBundle = [
      '# AI Stack Kit — aggregated system context',
      '',
      `Project: ${input.metadata.projectName ?? 'unknown'}`,
      `Generated: ${input.metadata.generatedAt}`,
      '',
      ...input.agents.map((a) => `## Agent: ${a.name}\n\n${a.systemPrompt ?? ''}\n\n---\n`),
    ].join('\n');

    files.push({
      path: '.claude/system-bundle.aistack.md',
      content: systemBundle,
      mergeStrategy: 'overwrite',
      managed: true,
    });

    for (const agent of input.agents) {
      files.push({
        path: `${agentsRel}/${cursorStyleAgentBasename(agent.id)}.md`,
        content: agentMarkdown(agent),
        mergeStrategy: 'overwrite',
        managed: true,
      });
    }

    for (const prompt of input.prompts) {
      files.push({
        path: `.claude/prompts/${sanitizePathSegment(prompt.id)}.md`,
        content: `# ${prompt.title}\n\n_role: ${prompt.role}_\n\n${prompt.body}\n`,
        mergeStrategy: 'overwrite',
        managed: true,
      });
    }

    const orchestrationTpl = loadBundledTemplate('claude', 'orchestration.md.tpl');
    const orch = orchestrationTpl
      ? renderTemplate(orchestrationTpl, {
          project: input.metadata.projectName ?? '',
          agentCount: String(input.agents.length),
          promptCount: String(input.prompts.length),
        })
      : [
          '# Claude session orchestration',
          '',
          'Load `system-bundle.aistack.md` once per session, then agents under `agents/` and prompts under `prompts/` as needed.',
          '',
        ].join('\n');

    files.push({
      path: '.claude/README.aistack.md',
      content: orch,
      mergeStrategy: 'overwrite',
      managed: true,
    });

    return { files };
  }
}
