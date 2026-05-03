/**
 * Cursor: file-based agents + prompt files under `.cursor/`.
 * Mapping: normalized {@link AgentDefinition} + {@link NormalizedPrompt} → `.cursor/agents/*.md` + `.cursor/prompts/*.md`.
 */

import type { AdapterOutput, AdapterOutputFile } from '../adapter-output.js';
import { BaseClientAdapter } from '../base-client-adapter.js';
import type { NormalizedWorkspaceInput } from '../normalized.js';
import { loadBundledTemplate, renderTemplate } from '../template-loader.js';

function slug(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'agent';
}

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
    const files: AdapterOutputFile[] = [];
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
        `spec_engine: "1"`,
        `agent_id: "${agent.id}"`,
        `source_skill: "${agent.sourceSkillId ?? ''}"`,
        '---',
        '',
      ].join('\n');

      files.push({
        path: `.cursor/agents/${slug(agent.id)}.md`,
        content: header + body,
        mergeStrategy: 'overwrite',
        managed: true,
        provenance: `spec-engine:${input.metadata.generatedAt}`,
      });
    }

    for (const prompt of input.prompts) {
      files.push({
        path: `.cursor/prompts/${slug(prompt.id)}.md`,
        content: [
          '---',
          `spec_engine: "1"`,
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
      path: '.spec-engine/manifest.cursor.json',
      content:
        JSON.stringify(
          {
            version: 1,
            generatedAt: input.metadata.generatedAt,
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
