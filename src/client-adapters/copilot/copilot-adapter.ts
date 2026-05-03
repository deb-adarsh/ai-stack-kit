/**
 * GitHub Copilot (VS Code): minimal agent abstraction — settings subtree + prompt snippets file.
 * Merges into `.vscode/settings.json` under `aistack.copilot` to avoid clobbering user settings.
 */

import type { AdapterOutput, AdapterOutputFile } from '../adapter-output.js';
import { BaseClientAdapter } from '../base-client-adapter.js';
import type { NormalizedWorkspaceInput } from '../normalized.js';
import { loadBundledTemplate, renderTemplate } from '../template-loader.js';
import { VSCODE_SETTINGS_ROOT_KEY, WORKSPACE_DOTDIR } from '../../branding.js';

export class CopilotClientAdapter extends BaseClientAdapter {
  readonly name = 'copilot';

  supports(clientType: string): boolean {
    return clientType === 'copilot';
  }

  generateConfig(input: NormalizedWorkspaceInput): AdapterOutput {
    const snippets: Record<string, string> = {};
    for (const p of input.prompts) {
      snippets[p.id] = p.body;
    }

    const patch = {
      [VSCODE_SETTINGS_ROOT_KEY]: {
        copilot: {
          version: 1,
          generatedAt: input.metadata.generatedAt,
          skills: input.skills.map((s) => ({ id: s.id, name: s.name, version: s.version })),
          agents: input.agents.map((a) => ({
            id: a.id,
            name: a.name,
            systemPrompt: a.systemPrompt ?? '',
          })),
          promptSnippets: snippets,
        },
      },
    };

    const files: AdapterOutputFile[] = [
      {
        path: '.vscode/settings.json',
        content: JSON.stringify(patch, null, 2) + '\n',
        mergeStrategy: 'merge',
        managed: false,
      },
    ];

    const tpl = loadBundledTemplate('copilot', 'instructions.md.tpl');
    const instructions = tpl
      ? renderTemplate(tpl, {
          skillCount: String(input.skills.length),
          agentCount: String(input.agents.length),
        })
      : [
          '# Copilot usage',
          '',
          'Snippets are registered under `aistack.copilot.promptSnippets` in settings.',
          'Reference them from custom instructions or chat prompts as needed.',
          '',
        ].join('\n');

    files.push({
      path: `${WORKSPACE_DOTDIR}/copilot/INSTRUCTIONS.md`,
      content: instructions,
      mergeStrategy: 'overwrite',
      managed: true,
    });

    return { files };
  }
}
