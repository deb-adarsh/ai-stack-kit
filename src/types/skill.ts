/**
 * Core skill types and interfaces
 */

import type { AIModuleType } from './ai-module.js';

/**
 * Skill reference - points to a skill in a source
 */
export interface SkillReference {
  /** Skill name/identifier */
  name: string;
  /** Semver version or tag (e.g., '^1.0.0', 'latest', undefined = latest) */
  version?: string;
  /** Source type (github, npm, registry, local, http, git) */
  source: SourceType;
  /** Source-specific configuration (extensible) */
  sourceConfig?: SourceConfig;
}

/**
 * Source type - extensible for future sources
 */
export type SourceType = 
  | 'github'    // GitHub repositories
  | 'npm'       // npm packages
  | 'registry'  // Custom skill registries
  | 'local'     // Local file system
  | 'git'       // Generic git repos
  | 'http'      // HTTP(S) downloads
  | string;     // Allow custom source types

/**
 * Source configuration - extensible per source type
 */
export interface SourceConfig {
  // GitHub-specific
  owner?: string;
  repo?: string;
  branch?: string;
  path?: string;
  token?: string;
  
  // npm-specific
  registry?: string;
  scope?: string;
  
  // Registry-specific
  registryUrl?: string;
  registryName?: string;
  
  // Local-specific
  localPath?: string;
  
  // Git-specific
  gitUrl?: string;
  ref?: string;
  
  // HTTP-specific
  url?: string;
  headers?: Record<string, string>;
  
  // Extensible for custom sources
  [key: string]: unknown;
}

/**
 * Skill definition in spec.yaml
 */
export interface Skill {
  /** Skill name */
  name: string;
  /** Version constraint */
  version?: string;
  /** Source type */
  source: SourceType;
  /** Source configuration */
  sourceConfig?: SourceConfig;
  /** Skill-specific configuration (passed to the skill) */
  config?: SkillConfig;
  /** Dependencies on other skills */
  dependencies?: SkillReference[];
  /** Enabled by default? */
  enabled?: boolean;
  /**
   * AI stack role: skill (default), subagent, or hook.
   * Use top-level `modules:` in spec for clarity, or set per entry under `skills:`.
   */
  moduleType?: AIModuleType;
}

/**
 * Skill configuration - passed to skill at runtime
 */
export interface SkillConfig {
  [key: string]: unknown;
}

/**
 * Resolved skill metadata
 */
export interface SkillMetadata {
  /** Unique identifier (name@version) */
  id: string;
  /** Skill name */
  name: string;
  /** Resolved version */
  version: string;
  /** Source reference */
  source: SkillReference;
  /** Description */
  description?: string;
  /** Author */
  author?: string;
  /** License */
  license?: string;
  /** Tags */
  tags?: string[];
  /** Supported clients/IDEs */
  supportedClients?: string[];
  /** Dependencies */
  dependencies?: SkillReference[];
  /** Content checksum (SHA-256) */
  checksum: string;
  /** Fetch URL */
  fetchUrl: string;
  /** Additional metadata (extensible) */
  metadata?: Record<string, unknown>;
}

/**
 * Skill content (fetched from source)
 */
export interface SkillContent {
  /** Skill metadata */
  metadata: SkillMetadata;
  /** Files (filename -> content) */
  files: Record<string, string>;
  /** Parsed manifest */
  manifest: SkillManifest;
}

/**
 * Skill manifest (skill.json or extracted from source)
 */
export interface SkillManifest {
  /** Manifest schema version */
  manifestVersion: string;
  /** Skill name */
  name: string;
  /** Skill version */
  version: string;
  /** Description */
  description?: string;
  /** Author */
  author?: string;
  /** License */
  license?: string;
  /** Homepage */
  homepage?: string;
  /** Repository */
  repository?: string;
  /** Tags */
  tags?: string[];
  /** Supported clients/IDEs */
  supportedClients?: string[];
  /** Client-specific configuration */
  clientConfig?: Record<string, AdapterConfig>;
  /** Dependencies */
  dependencies?: Record<string, string>;
  /** Entry point */
  main?: string;
  /** Files to include */
  files?: string[];
  /** Optional IDE / capability requirements (used by adapters) */
  features?: string[];
  /** Lifecycle hooks */
  hooks?: LifecycleHooks;
  /** Extensible metadata */
  [key: string]: unknown;
}

/**
 * Adapter-specific configuration
 */
export interface AdapterConfig {
  /** Skills directory */
  skillsDir?: string;
  /** Rules directory */
  rulesDir?: string;
  /** Hooks directory */
  hooksDir?: string;
  /** File mappings (source -> destination) */
  files?: Record<string, string>;
  /** Settings to apply */
  settings?: Record<string, unknown>;
  /** Extensions to install */
  extensions?: string[];
  /** Extensible per adapter */
  [key: string]: unknown;
}

/**
 * Lifecycle hooks
 */
export interface LifecycleHooks {
  preInstall?: string[];
  postInstall?: string[];
  preApply?: string[];
  postApply?: string[];
  preUninstall?: string[];
  postUninstall?: string[];
}

/**
 * Installed skill
 */
export interface InstalledSkill {
  /** Skill metadata */
  metadata: SkillMetadata;
  /** Installation path */
  installPath: string;
  /** Installation timestamp */
  installedAt: Date;
  /** Files written */
  files: string[];
  /** Configuration used */
  config?: SkillConfig;
}

/**
 * Skill status
 */
export type SkillStatus = 
  | 'pending'
  | 'resolving'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'installed'
  | 'applying'
  | 'applied'
  | 'failed'
  | 'disabled';

/**
 * Skill installation state
 */
export interface SkillInstallationState {
  skillId: string;
  status: SkillStatus;
  error?: Error;
  progress?: number;
  startedAt?: Date;
  completedAt?: Date;
}
