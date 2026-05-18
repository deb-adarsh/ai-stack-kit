/**
 * Canonical paths for project-local and profile-global AI Stack Kit workspaces.
 */

import { existsSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { WORKSPACE_DOTDIR } from '../branding.js';

/** Profile workspace root: `~/.aistack` */
export function userAistackRoot(): string {
  return path.join(os.homedir(), WORKSPACE_DOTDIR);
}

export function userSpecPath(): string {
  return path.join(userAistackRoot(), 'spec.yaml');
}

export function userSourcesConfigPath(): string {
  return path.join(userAistackRoot(), 'sources.config.yaml');
}

export function hasProfileSpec(): boolean {
  return existsSync(userSpecPath());
}
