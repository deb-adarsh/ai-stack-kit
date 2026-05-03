/**
 * Cursor: skills under `.cursor/skills/{skill}/` (with `SKILL.md`), subagents under `.cursor/agents/*.md`,
 * prompts under `.cursor/prompts/*.md`. Same layout under `~/.cursor/` when `client.installScope: user`.
 */

import type { AdapterOutput, AdapterOutputFile } from '../adapter-output.js';
import { BaseClientAdapter } from '../base-client-adapter.js';
import { agentsDirRelative, resolveInstallScope, skillsDirRelative } from '../client-paths.js';
import {
  cursorStyleAgentBasename,
  emitSkillTreeFiles,
  sanitizePathSegment,
} from '../emit-skill-agent-files.js';
import type { NormalizedWorkspaceInput } from '../normalized.js';
import { loadBundledTemplate, renderTemplate } from '../template-loader.js';
import { CLI_COMMAND, GENERATED_FILE_MARKER_KEY, WORKSPACE_DOTDIR } from '../../branding.js';

function defaultAgentMarkdown(input: {
  name: string;
  description?: string;
  systemPrompt?: string;
  promptIds?: string[];
  toolIds?: string[];
}): string {
  const promptIds = input.promptIds ?? [];
  const toolIds = input.toolIds ?? [];
  return [
    `# ${input.name}`,
    '',
    input.description ?? '',
    '',
    '## System',
    input.systemPrompt ?? '_No system prompt._',
    '',
    '## Linked prompts',
    promptIds.length ? promptIds.map((id) => `- \`${id}\``).join('\n') : '_None_',
    '',
    '## Tools',
    toolIds.length ? toolIds.map((id) => `- \`${id}\``).join('\n') : '_None_',
    '',
  ].join('\n');
}

export class CursorClientAdapter extends BaseClientAdapter {
  readonly name = 'cursor';

  supports(clientType: string): boolean {
    return clientType === 'cursor';
  }

  generateConfig(input: NormalizedWorkspaceInput): AdapterOutput {
    const scope = resolveInstallScope(input.client);
    const skillsRel = skillsDirRelative(input.client.type, scope);
    const agentsRel = agentsDirRelative(input.client.type, scope);

    const files: AdapterOutputFile[] = [...emitSkillTreeFiles(input.skills, skillsRel)];
    const tpl = loadBundledTemplate('cursor', 'agent.md.tpl');

    for (const agent of input.agents) {
      const body = tpl
        ? renderTemplate(tpl, {
            name: agent.name,
            description: agent.description ?? '',
            systemPrompt: agent.systemPrompt ?? '',
            promptIds: agent.promptIds?.join(', ') ?? '',
            toolIds: agent.toolIds?.join(', ') ?? '',
          })
        : defaultAgentMarkdown(agent);

      const header = [
        '---',
        `${GENERATED_FILE_MARKER_KEY}: "1"`,
        `agent_id: "${agent.id}"`,
        `source_skill: "${agent.sourceSkillId ?? ''}"`,
        '---',
        '',
      ].join('\n');

      files.push({
        path: `${agentsRel}/${cursorStyleAgentBasename(agent.id)}.md`,
        content: header + body,
        mergeStrategy: 'overwrite',
        managed: true,
        provenance: `${CLI_COMMAND}:${input.metadata.generatedAt}`,
      });
    }

    for (const prompt of input.prompts) {
      files.push({
        path: `.cursor/prompts/${sanitizePathSegment(prompt.id)}.md`,
        content: [
          '---',
          `${GENERATED_FILE_MARKER_KEY}: "1"`,
          `prompt_id: "${prompt.id}"`,
          `role: "${prompt.role}"`,
          `source_skill: "${prompt.sourceSkillId ?? ''}"`,
          '---',
          '',
          `# ${prompt.title}`,
          '',
          prompt.body,
          '',
        ].join('\n'),
        mergeStrategy: 'overwrite',
        managed: true,
      });
    }

    files.push({
      path: `${WORKSPACE_DOTDIR}/manifest.cursor.json`,
      pathAnchor: 'project',
      content:
        JSON.stringify(
          {
            version: 1,
            generatedAt: input.metadata.generatedAt,
            installScope: scope,
            skills: input.skills.map((s) => ({ id: s.id, name: s.name, version: s.version })),
            agents: input.agents.map((a) => a.id),
            prompts: input.prompts.map((p) => p.id),
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
