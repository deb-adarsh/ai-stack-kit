/**
 * Versioned string templates per client. Adapters load these and interpolate variables.
 * Path: `templates/clients/<client>/<file>` relative to package / repo root.
 */

import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repo-relative default (works when CWD is repo root). */
export function templatesRoot(cwd = process.cwd()): string {
  return path.join(cwd, 'templates', 'clients');
}

export async function loadClientTemplate(
  clientDir: string,
  fileName: string,
  cwd = process.cwd()
): Promise<string> {
  const p = path.join(templatesRoot(cwd), clientDir, fileName);
  return readFile(p, 'utf-8');
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => vars[key] ?? '');
}

/** Resolve repo-root `templates/clients` next to `src/` (bundled layout). */
export function bundledTemplatesDir(): string {
  return fileURLToPath(new URL('../../templates/clients', import.meta.url));
}

/** Load template shipped with AI Stack Kit (sync, for {@link ClientAdapter.generateConfig}). */
export function loadBundledTemplate(clientDir: string, fileName: string): string | null {
  const p = path.join(bundledTemplatesDir(), clientDir, fileName);
  try {
    return readFileSync(p, 'utf-8');
  } catch {
    return null;
  }
}
