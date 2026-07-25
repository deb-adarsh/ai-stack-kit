/**
 * Profile (global) spec under ~/.aistack/spec.yaml
 */

import { existsSync, promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { WORKSPACE_DOTDIR } from '../branding.js';
import { ensureDefaultSourcesConfig } from '../cli/commands.js';
import type { ClientType, SpecFile } from '../types/spec.js';
import { userAistackRoot, userSpecPath } from '../paths/aistack-paths.js';

export interface EnsureProfileSpecOptions {
  clientType?: ClientType;
  /** When set, reuse client.type from an existing project spec. */
  projectSpec?: SpecFile;
}

/**
 * Create ~/.aistack and spec.yaml if missing. Profile spec always uses `client.installScope: user`.
 */
export async function ensureProfileSpec(options: EnsureProfileSpecOptions = {}): Promise<string> {
  const root = userAistackRoot();
  await fs.mkdir(root, { recursive: true });

  const specPath = userSpecPath();
  if (!existsSync(specPath)) {
    const clientType =
      options.clientType ??
      (options.projectSpec?.client?.type as ClientType | undefined) ??
      'copilot';

    const spec: SpecFile = {
      version: '1.0',
      project: {
        name: 'profile',
        description: 'AI Stack Kit profile — modules synced to your home directory',
      },
      client: {
        type: clientType,
        installScope: 'user',
        features: ['skills', 'agents', 'hooks'],
      },
      skills: [],
      modules: [],
      settings: {
        autoSync: false,
        verifyChecksums: true,
        cacheDir: `~/${WORKSPACE_DOTDIR.slice(1)}/cache`,
        lockFile: `${WORKSPACE_DOTDIR}/lock.yaml`,
      },
    };

    await fs.writeFile(specPath, yaml.dump(spec, { indent: 2, lineWidth: -1 }), 'utf-8');
  }

  await ensureDefaultSourcesConfig(root);
  return root;
}
