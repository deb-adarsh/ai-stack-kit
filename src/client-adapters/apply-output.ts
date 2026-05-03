/**
 * Apply {@link AdapterOutput} to disk with merge strategies and conflict markers.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { AdapterApplyOptions, AdapterApplyReport, AdapterOutput, AdapterOutputFile } from './adapter-output.js';
import { deepMerge, parseJsonSafe, stringifyJsonSorted } from './merge-json.js';

const CONFLICT = '<<<<<<< SPEC_ENGINE_CONFLICT\n';
const MID = '\n=======\n';
const END = '\n>>>>>>> SPEC_ENGINE_CONFLICT\n';

export async function applyAdapterOutput(
  output: AdapterOutput,
  projectPath: string,
  options: AdapterApplyOptions = {}
): Promise<AdapterApplyReport> {
  const written: string[] = [];
  const skipped: string[] = [];
  const merged: string[] = [];
  const conflicts: { path: string; message: string }[] = [];

  for (const file of output.files) {
    const abs = path.join(projectPath, ...file.path.split('/').filter(Boolean));
    await mkdir(path.dirname(abs), { recursive: true });

    if (options.dryRun) {
      skipped.push(file.path);
      continue;
    }

    if (file.mergeStrategy === 'overwrite' || file.managed !== false) {
      await writeFile(abs, file.content, 'utf-8');
      written.push(file.path);
      continue;
    }

    try {
      const existing = await readFile(abs, 'utf-8');
      if (file.mergeStrategy === 'append') {
        const sep = existing.endsWith('\n') ? '\n' : '\n\n';
        await writeFile(abs, existing + sep + file.content, 'utf-8');
        merged.push(file.path);
      } else if (file.mergeStrategy === 'merge' && file.path.endsWith('.json')) {
        const base = parseJsonSafe(existing);
        const patch = parseJsonSafe(file.content);
        if (!base || !patch) {
          if (options.strictConflicts) {
            conflicts.push({ path: file.path, message: 'Invalid JSON for merge' });
            continue;
          }
          await writeFile(abs, CONFLICT + existing + MID + file.content + END, 'utf-8');
          merged.push(file.path);
          continue;
        }
        await writeFile(abs, stringifyJsonSorted(deepMerge(base, patch)), 'utf-8');
        merged.push(file.path);
      } else {
        if (existing.trim() === file.content.trim()) {
          skipped.push(file.path);
        } else if (options.strictConflicts) {
          conflicts.push({ path: file.path, message: 'File exists and mergeStrategy is not merge' });
        } else {
          await writeFile(abs, CONFLICT + existing + MID + file.content + END, 'utf-8');
          merged.push(file.path);
        }
      }
    } catch {
      await writeFile(abs, file.content, 'utf-8');
      written.push(file.path);
    }
  }

  return { written, skipped, merged, conflicts: conflicts.length ? conflicts : undefined };
}

/** Default apply: each {@link ClientAdapter} can delegate here or customize. */
export async function applyFiles(
  files: AdapterOutputFile[],
  projectPath: string,
  options?: AdapterApplyOptions
): Promise<AdapterApplyReport> {
  return applyAdapterOutput({ files, warnings: [] }, projectPath, options);
}
