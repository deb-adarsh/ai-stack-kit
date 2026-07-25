/**
 * Proactively create client install directories before adapter apply.
 */

import { mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import type { ClientConfig } from '../types/spec.js';
import {
  adapterFilesystemRoot,
  agentsDirRelative,
  hooksDirRelative,
  resolveInstallScope,
  skillsDirRelative,
} from './client-paths.js';

export async function ensureClientInstallDirs(
  client: ClientConfig,
  projectPath: string
): Promise<string[]> {
  const scope = resolveInstallScope(client);
  const root = adapterFilesystemRoot(scope, projectPath);
  const relativeDirs = [
    skillsDirRelative(client.type, scope),
    agentsDirRelative(client.type, scope),
    hooksDirRelative(client.type, scope),
  ];

  await Promise.all(
    relativeDirs.map((rel) => mkdir(path.join(root, ...rel.split('/').filter(Boolean)), { recursive: true }))
  );

  return relativeDirs.map((rel) => path.join(root, ...rel.split('/').filter(Boolean)));
}
