/**
 * Spec file types and configuration
 */

import { Skill, LifecycleHooks } from './skill.js';

/**
 * Main spec.yaml structure
 */
export interface SpecFile {
  /** Spec schema version */
  version: string;
  /** Project metadata */
  project?: ProjectMetadata;
  /** Client/IDE configuration */
  client: ClientConfig;
  /**
   * Skills / prompt packs (default AI module type: skill).
   * @deprecated Prefer `modules` for new specs; both arrays are merged by the pipeline.
   */
  skills: Skill[];
  /**
   * Additional AI modules (same shape as skills): subagents, hooks, or typed skills.
   * Merged with `skills` for resolve / install / normalize.
   */
  modules?: Skill[];
  /** Global settings */
  settings?: SpecSettings;
  /** Lifecycle hooks */
  hooks?: LifecycleHooks;
  /** Extensible metadata */
  metadata?: Record<string, unknown>;
}

/** All installable module rows: `skills` then `modules` (dedupe by name not applied — avoid duplicates in spec). */
export function flattenSpecModules(spec: SpecFile): Skill[] {
  return [...(spec.skills ?? []), ...(spec.modules ?? [])];
}

/**
 * Project metadata
 */
export interface ProjectMetadata {
  /** Project name */
  name?: string;
  /** Project description */
  description?: string;
  /** Project version */
  version?: string;
  /** Author */
  author?: string;
  /** Repository */
  repository?: string;
  /** License */
  license?: string;
  /** Tags */
  tags?: string[];
}

/**
 * Client/IDE configuration
 */
export interface ClientConfig {
  /** Client type (cursor, vscode, etc.) */
  type: ClientType;
  /**
   * Where adapter output for skills/agents is rooted.
   * - `project` (default): `.cursor/`, `.claude/`, `.github/` under the repo.
   * - `user`: `~/.cursor/`, `~/.claude/`, `~/.copilot/` for global installs.
   * VS Code workspace merges (e.g. Copilot `settings.json`) always use the project root.
   */
  installScope?: ClientInstallScope;
  /** Client version constraint */
  version?: string;
  /** Configuration directory path (override) */
  configDir?: string;
  /** Features to enable */
  features?: ClientFeature[];
  /** Client-specific settings */
  settings?: Record<string, unknown>;
  /** Adapter configuration */
  adapter?: AdapterOptions;
}

/**
 * Client type - extensible
 */
export type ClientType = 
  | 'cursor'
  | 'vscode'
  | 'claude'
  | 'copilot'
  | 'intellij'
  | 'vim'
  | 'neovim'
  | 'emacs'
  | string; // Allow custom clients

/** Where skills/agent trees are written on disk (see {@link ClientConfig.installScope}). */
export type ClientInstallScope = 'project' | 'user';

/**
 * Client features
 */
export type ClientFeature =
  | 'skills'
  | 'rules'
  | 'hooks'
  | 'settings'
  | 'extensions'
  | 'snippets'
  | 'themes'
  | string; // Extensible

/**
 * Adapter options
 */
export interface AdapterOptions {
  /** Backup before applying */
  backup?: boolean;
  /** Merge strategy (replace, merge, append) */
  mergeStrategy?: 'replace' | 'merge' | 'append';
  /** Dry run */
  dryRun?: boolean;
  /** Extensible options */
  [key: string]: unknown;
}

/**
 * Global settings
 */
export interface SpecSettings {
  /** Cache directory */
  cacheDir?: string;
  /** Lock file path */
  lockFile?: string;
  /** State directory */
  stateDir?: string;
  /** Auto-sync on spec changes */
  autoSync?: boolean;
  /** Parallel operations limit */
  concurrency?: number;
  /** Network timeout (ms) */
  timeout?: number;
  /** Retry attempts */
  retries?: number;
  /** Verify checksums */
  verifyChecksums?: boolean;
  /** Offline mode */
  offline?: boolean;
  /** Log level */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** Extensible settings */
  [key: string]: unknown;
}

export interface LockFile {
  /** Lock file version */
  version: string;
  /** Generation timestamp */
  generated: Date;
  /** Resolved skills */
  resolved: ResolvedSkill[];
  /** Applied skills */
  applied?: AppliedState;
}

export interface ResolvedSkill {
  /** Unique skill ID */
  id: string;
  /** Skill name */
  name: string;
  /** Resolved version */
  version: string;
  /** Source identifier */
  source: string;
  /** Resolved URL */
  resolved: string;
  /** Content checksum */
  checksum: string;
  /** Dependencies */
  dependencies: string[];
}

export interface AppliedState {
  /** IDE type */
  ide: string;
  /** IDE config path */
  path: string;
  /** Applied skills */
  skills: AppliedSkill[];
}

export interface AppliedSkill {
  /** Skill ID from resolved */
  id: string;
  /** When it was applied */
  appliedAt: Date;
  /** Files written */
  files: string[];
}
