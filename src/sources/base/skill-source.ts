/**
 * Pluggable skill sources (GitHub, npm, …).
 *
 * Flow: resolve(ref) → fetch(metadata) → install(metadata, files, ctx)
 */

import type { SkillManifest, SkillMetadata, SkillReference } from '../../types/skill.js';
import type { SourceType } from '../../types/skill.js';

/** Raw files + optional manifest produced by {@link SkillSource.fetch}. */
export interface SkillFiles {
  files: Record<string, string>;
  manifest: SkillManifest | null;
}

/** Where {@link SkillSource.install} should materialize the skill on disk. */
export interface InstallContext {
  /** Root directory (e.g. ~/.spec-engine/skills or project .spec-engine/skills) */
  installRoot: string;
}

export interface SkillInstallResult {
  installPath: string;
  writtenFiles: string[];
}

/**
 * Pluggable backend for a single transport (GitHub tarball, npm tarball, …).
 *
 * - Use {@link SkillSourceFactory} to pick the right implementation from `ref.source`.
 * - Adding a source: implement this interface, call `factory.register(new MySource())`.
 */
export interface SkillSource {
  readonly type: SourceType;

  /** Whether this source owns references of this shape (usually `ref.source === type`). */
  canHandle(ref: SkillReference): boolean;

  /** Resolve version, tarball/clone target, checksum, etc. */
  resolve(ref: SkillReference): Promise<SkillMetadata>;

  /** Download / extract into an in-memory file map (+ manifest when present). */
  fetch(metadata: SkillMetadata): Promise<SkillFiles>;

  /** Write into `installRoot` / stable layout for adapters to consume. */
  install(metadata: SkillMetadata, fetched: SkillFiles, ctx: InstallContext): Promise<SkillInstallResult>;
}
