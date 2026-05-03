/**
 * Claude: prompt orchestration — system bundles + reusable prompt files (no Cursor paths).
 */

import type { AdapterOutput, AdapterOutputFile } from '../adapter-output.js';
import { BaseClientAdapter } from '../base-client-adapter.js';
import type { NormalizedWorkspaceInput } from '../normalized.js';
import { loadBundledTemplate, renderTemplate } from '../template-loader.js';

export class ClaudeClientAdapter extends BaseClientAdapter {
  readonly name = 'claude';

  supports(clientType: string): boolean {
    return clientType === 'claude';
  }

  generateConfig(input: NormalizedWorkspaceInput): AdapterOutput {
    const files: AdapterOutputFile[] = [];
    const orchestrationTpl = loadBundledTemplate('claude', 'orchestration.md.tpl');

    const systemBundle = [
      '# Ai Stack Kit — aggregated system context',
      '',
      `Project: ${input.metadata.projectName ?? 'unknown'}`,
      `Generated: ${input.metadata.generatedAt}`,
      '',
      ...input.agents.map(
        (a) =>
          `## Agent: ${a.name}\n\n${a.systemPrompt ?? ''}\n\n---\n`
      ),
    ].join('\n');

    files.push({
      path: '.aistack/claude/system-bundle.md',
      content: systemBundle,
      mergeStrategy: 'overwrite',
      managed: true,
    });

    for (const prompt of input.prompts) {
      files.push({
        path: `.aistack/claude/prompts/${prompt.id.replace(/[^a-zA-Z0-9._-]/g, '-')}.md`,
        content: `# ${prompt.title}\n\n_role: ${prompt.role}_\n\n${prompt.body}\n`,
        mergeStrategy: 'overwrite',
        managed: true,
      });
    }

    const orch = orchestrationTpl
      ? renderTemplate(orchestrationTpl, {
          project: input.metadata.projectName ?? '',
          agentCount: String(input.agents.length),
          promptCount: String(input.prompts.length),
        })
      : [
          '# Claude session orchestration',
          '',
          'Load `system-bundle.md` once per session, then individual prompts from `prompts/` as needed.',
          '',
        ].join('\n');

    files.push({
      path: '.aistack/claude/README.md',
      content: orch,
      mergeStrategy: 'overwrite',
      managed: true,
    });

    return { files };
  }
}
