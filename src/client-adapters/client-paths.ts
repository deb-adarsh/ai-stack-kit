/**
 * Canonical layout for skills, agents, and hook packs across Cursor, Copilot, and Claude.
 *
 * Project vs user scope:
 * - `project`: paths live under the repo root (or VS Code workspace root).
 * - `user`: paths live under the OS user home directory (~/.cursor, ~/.copilot, ~/.claude).
 *
 * Copilot project scope uses `.github/skills` and `.github/agents/` (GitHub convention).
 * VS Code `settings.json` always merges relative to the **project** root.
 */

import * as os from 'node:os';
import type { ClientConfig, ClientInstallScope } from '../types/spec.js';

export type { ClientInstallScope };

export function resolveInstallScope(client: ClientConfig): ClientInstallScope {
  return client.installScope === 'user' ? 'user' : 'project';
}

export function adapterFilesystemRoot(scope: ClientInstallScope, projectPath: string): string {
  return scope === 'user' ? os.homedir() : projectPath;
}

export function skillsDirRelative(clientType: string, scope: ClientInstallScope): string {
  switch (clientType) {
    case 'cursor':
      return '.cursor/skills';
    case 'claude':
      return '.claude/skills';
    case 'copilot':
      return scope === 'project' ? '.github/skills' : '.copilot/skills';
    default:
      return '.aistack/skills';
  }
}

export function agentsDirRelative(clientType: string, scope: ClientInstallScope): string {
  switch (clientType) {
    case 'cursor':
      return '.cursor/agents';
    case 'claude':
      return '.claude/agents';
    case 'copilot':
      return scope === 'project' ? '.github/agents' : '.copilot/agents';
    default:
      return '.aistack/agents';
  }
}

/** Copilot hook packs use `.github/hooks/` (project) to align with community layouts (e.g. awesome-copilot). */
export function hooksDirRelative(clientType: string, scope: ClientInstallScope): string {
  switch (clientType) {
    case 'cursor':
      return '.cursor/hooks';
    case 'claude':
      return '.claude/hooks';
    case 'copilot':
      return scope === 'project' ? '.github/hooks' : '.copilot/hooks';
    default:
      return '.aistack/hooks';
  }
}
