/**
 * Load and validate `spec.yaml` from a project directory (not tied to `process.cwd()`).
 */

import type { SpecFile } from '../types/spec.js';
import { validateSpec } from '../validation/schema.js';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import yaml from 'js-yaml';

export async function loadSpec(projectRoot: string, fileName = 'spec.yaml'): Promise<SpecFile> {
  const specPath = path.join(projectRoot, fileName);
  let content: string;
  try {
    content = await readFile(specPath, 'utf-8');
  } catch {
    const err = new Error(`spec not found: ${specPath}`) as Error & { code: 'SPEC_NOT_FOUND' };
    err.code = 'SPEC_NOT_FOUND';
    throw err;
  }
  const raw = yaml.load(content) as unknown;

  const validation = validateSpec(raw);
  if (!validation.success) {
    const errors = validation.errors?.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    const err = new Error('Spec validation failed') as Error & {
      code: 'VALIDATION_ERROR';
      errors?: { path: string; message: string }[];
    };
    err.code = 'VALIDATION_ERROR';
    err.errors = errors;
    throw err;
  }

  return validation.data!;
}
