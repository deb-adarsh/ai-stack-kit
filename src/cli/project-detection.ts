/**
 * Project stack detection for skill suggestions (no network I/O).
 */

import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

export interface ProjectSignals {
  cwd: string;
  hasPackageJson: boolean;
  /** Any Node-oriented package.json present */
  isNodeProject: boolean;
  /** React / Next / RN surface */
  usesReact: boolean;
  usesNext: boolean;
  usesReactNative: boolean;
  usesTypeScript: boolean;
  /** Heuristic backend / API frameworks */
  backendHints: string[];
  hasJestOrVitest: boolean;
  hasPython: boolean;
  hasRust: boolean;
}

function readDeps(pkg: Record<string, unknown>): Record<string, string> {
  const d = (pkg.dependencies ?? {}) as Record<string, string>;
  const dev = (pkg.devDependencies ?? {}) as Record<string, string>;
  return { ...d, ...dev };
}

function hasDep(deps: Record<string, string>, name: string): boolean {
  return Boolean(deps[name]);
}

const BACKEND_MARKERS = [
  'express',
  'fastify',
  '@nestjs/core',
  'koa',
  'hono',
  '@hono/node-server',
  'restify',
  'polka',
] as const;

/**
 * Inspect `cwd` for common markers used to route skill suggestions.
 */
export async function detectProjectSignals(cwd: string): Promise<ProjectSignals> {
  const signals: ProjectSignals = {
    cwd,
    hasPackageJson: false,
    isNodeProject: false,
    usesReact: false,
    usesNext: false,
    usesReactNative: false,
    usesTypeScript: false,
    backendHints: [],
    hasJestOrVitest: false,
    hasPython: false,
    hasRust: false,
  };

  const pkgPath = path.join(cwd, 'package.json');
  try {
    const raw = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    signals.hasPackageJson = true;
    signals.isNodeProject = true;
    const deps = readDeps(pkg);

    signals.usesReact =
      hasDep(deps, 'react') ||
      hasDep(deps, 'react-dom') ||
      hasDep(deps, 'preact') ||
      hasDep(deps, '@emotion/react');
    signals.usesNext = hasDep(deps, 'next');
    signals.usesReactNative = hasDep(deps, 'react-native');
    const devDeps = pkg['devDependencies'];
    signals.usesTypeScript =
      hasDep(deps, 'typescript') ||
      Boolean(
        devDeps && typeof devDeps === 'object' && devDeps !== null && 'typescript' in devDeps
      );

    for (const m of BACKEND_MARKERS) {
      if (hasDep(deps, m)) signals.backendHints.push(m);
    }

    signals.hasJestOrVitest = hasDep(deps, 'jest') || hasDep(deps, 'vitest') || hasDep(deps, '@playwright/test');
  } catch {
    /* no package.json */
  }

  try {
    await readFile(path.join(cwd, 'requirements.txt'), 'utf-8');
    signals.hasPython = true;
  } catch {
    try {
      await readFile(path.join(cwd, 'pyproject.toml'), 'utf-8');
      signals.hasPython = true;
    } catch {
      /* */
    }
  }

  try {
    await readFile(path.join(cwd, 'Cargo.toml'), 'utf-8');
    signals.hasRust = true;
  } catch {
    /* */
  }

  return signals;
}

/**
 * One-line human summary for CLI output.
 */
export function summarizeSignals(s: ProjectSignals): string {
  const bits: string[] = [];
  if (s.isNodeProject) bits.push('Node.js');
  if (s.usesReact || s.usesNext) bits.push(s.usesNext ? 'Next.js' : 'React');
  if (s.usesReactNative) bits.push('React Native');
  if (s.usesTypeScript) bits.push('TypeScript');
  if (s.backendHints.length) bits.push(`API (${s.backendHints.join(', ')})`);
  if (s.hasJestOrVitest) bits.push('tests');
  if (s.hasPython) bits.push('Python');
  if (s.hasRust) bits.push('Rust');
  return bits.length ? bits.join(' · ') : 'generic project';
}
