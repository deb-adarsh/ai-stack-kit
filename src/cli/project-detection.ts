/**
 * Project stack detection for skill suggestions (no network I/O).
 */

import type { Dirent } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
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
  /** .NET: solution, project files, C#/F# sources (bounded scan) */
  usesDotnet: boolean;
  /** Java / Kotlin JVM: Maven, Gradle, or sources (bounded scan) */
  usesJava: boolean;
  usesGo: boolean;
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

/** Skip heavy / irrelevant trees during marker scans */
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  'dist',
  'build',
  'out',
  'bin',
  'obj',
  'packages',
  '.vs',
  '.idea',
  'target',
  '__pycache__',
  '.venv',
  'venv',
  'coverage',
  '.turbo',
  '.next',
]);

async function fileExists(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

async function readDirSafe(dir: string): Promise<Dirent[]> {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Depth-first: first file ending with `suffix` under `root`, max `maxDepth`. */
async function findFileSuffixUnder(
  root: string,
  suffix: string,
  maxDepth: number,
  depth = 0
): Promise<boolean> {
  if (depth > maxDepth) return false;
  const entries = await readDirSafe(root);
  for (const e of entries) {
    const name = e.name;
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      const hit = await findFileSuffixUnder(path.join(root, name), suffix, maxDepth, depth + 1);
      if (hit) return true;
      continue;
    }
    if (e.isFile() && name.endsWith(suffix)) return true;
  }
  return false;
}

async function detectDotnetRoot(cwd: string): Promise<boolean> {
  const entries = await readDirSafe(cwd);
  for (const e of entries) {
    if (!e.isFile()) continue;
    const n = e.name;
    if (n.endsWith('.sln')) return true;
    if (n.endsWith('.csproj') || n.endsWith('.fsproj') || n.endsWith('.vbproj')) return true;
    if (n.endsWith('.sln.DotSettings.user')) return true;
  }
  return false;
}

async function detectJavaRootAndOneLevel(cwd: string): Promise<boolean> {
  const markers = ['pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle', 'settings.gradle.kts'];
  for (const m of markers) {
    if (await fileExists(path.join(cwd, m))) return true;
  }
  const entries = await readDirSafe(cwd);
  for (const e of entries) {
    if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue;
    const sub = path.join(cwd, e.name);
    for (const m of markers) {
      if (await fileExists(path.join(sub, m))) return true;
    }
  }
  return false;
}

async function detectGoModShallow(cwd: string): Promise<boolean> {
  if (await fileExists(path.join(cwd, 'go.mod'))) return true;
  const entries = await readDirSafe(cwd);
  for (const e of entries) {
    if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue;
    if (await fileExists(path.join(cwd, e.name, 'go.mod'))) return true;
  }
  return false;
}

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
    usesDotnet: false,
    usesJava: false,
    usesGo: false,
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

    signals.hasJestOrVitest =
      hasDep(deps, 'jest') || hasDep(deps, 'vitest') || hasDep(deps, '@playwright/test');
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
  if (!signals.hasPython) {
    if (
      (await fileExists(path.join(cwd, 'Pipfile'))) ||
      (await fileExists(path.join(cwd, 'setup.py'))) ||
      (await fileExists(path.join(cwd, 'setup.cfg')))
    ) {
      signals.hasPython = true;
    } else if (await findFileSuffixUnder(cwd, '.py', 2)) {
      signals.hasPython = true;
    }
  }

  try {
    await readFile(path.join(cwd, 'Cargo.toml'), 'utf-8');
    signals.hasRust = true;
  } catch {
    /* */
  }

  signals.usesDotnet =
    (await detectDotnetRoot(cwd)) ||
    (await findFileSuffixUnder(cwd, '.csproj', 4)) ||
    (await findFileSuffixUnder(cwd, '.fsproj', 4)) ||
    (await findFileSuffixUnder(cwd, '.cs', 5));

  signals.usesJava =
    (await detectJavaRootAndOneLevel(cwd)) ||
    (await findFileSuffixUnder(cwd, '.java', 5)) ||
    (await findFileSuffixUnder(cwd, '.kt', 5));

  signals.usesGo = await detectGoModShallow(cwd);

  return signals;
}

/**
 * One-line human summary for CLI output.
 */
export function summarizeSignals(s: ProjectSignals): string {
  const bits: string[] = [];
  if (s.isNodeProject) bits.push('Node.js');
  if (s.usesDotnet) bits.push('.NET');
  if (s.usesJava) bits.push('Java/Kotlin');
  if (s.usesGo) bits.push('Go');
  if (s.hasPython) bits.push('Python');
  if (s.hasRust) bits.push('Rust');
  if (s.usesReact || s.usesNext) bits.push(s.usesNext ? 'Next.js' : 'React');
  if (s.usesReactNative) bits.push('React Native');
  if (s.usesTypeScript) bits.push('TypeScript');
  if (s.backendHints.length) bits.push(`API (${s.backendHints.join(', ')})`);
  if (s.hasJestOrVitest) bits.push('tests');
  return bits.length ? bits.join(' · ') : 'generic project';
}
