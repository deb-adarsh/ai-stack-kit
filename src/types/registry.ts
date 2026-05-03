/**
 * Registry types
 */

import type { AIModuleType } from './ai-module.js';

/**
 * Registry entry - skill listing in registry
 */
export interface RegistryEntry {
  /** Skill name */
  name: string;
  /** Description */
  description: string;
  /** Tags for categorization */
  tags: string[];
  /** Supported clients/IDEs */
  supportedClients: string[];
  /** Source information */
  source: RegistrySourceInfo;
  /** Available versions */
  versions: string[];
  /** Latest version */
  latest: string;
  /** Author */
  author?: string;
  /** License */
  license?: string;
  /** Homepage */
  homepage?: string;
  /** Repository */
  repository?: string;
  /** Download stats */
  stats?: RegistryStats;
  /** Created date */
  createdAt: Date;
  /** Last updated */
  updatedAt: Date;
  /** Extensible metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Registry source information
 */
export interface RegistrySourceInfo {
  /** Source type */
  type: string;
  /** Source URL or identifier */
  url: string;
  /** Fetch configuration */
  config?: Record<string, unknown>;
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  /** Total downloads */
  downloads: number;
  /** Weekly downloads */
  weeklyDownloads: number;
  /** Monthly downloads */
  monthlyDownloads: number;
  /** Stars/favorites */
  stars?: number;
  /** Forks */
  forks?: number;
}

/**
 * Registry search result
 */
export interface RegistrySearchResult {
  /** Skill name */
  name: string;
  /** Description */
  description: string;
  /** Latest version */
  version: string;
  /** Tags */
  tags: string[];
  /** Supported clients */
  supportedClients: string[];
  /** Relevance score (0-1) */
  score: number;
  /** Download count */
  downloads?: number;
  /** Registry entry source type (e.g. `github`, `npm`) for CLI mapping */
  sourceType?: string;
  /** AI stack role when catalog provides it */
  moduleType?: AIModuleType;
}

/**
 * Registry package info (all versions)
 */
export interface RegistryPackageInfo {
  /** Package name */
  name: string;
  /** Description */
  description?: string;
  /** All versions */
  versions: RegistryVersionInfo[];
  /** Version tags (latest, beta, etc.) */
  tags: Record<string, string>;
  /** Author */
  author?: string;
  /** License */
  license?: string;
  /** Repository */
  repository?: string;
  /** Homepage */
  homepage?: string;
  /** Download stats */
  stats?: RegistryStats;
}

/**
 * Registry version info
 */
export interface RegistryVersionInfo {
  /** Version */
  version: string;
  /** Description */
  description?: string;
  /** Dependencies */
  dependencies?: Record<string, string>;
  /** Distribution info */
  dist: DistInfo;
  /** Published date */
  publishedAt: Date;
  /** Deprecated? */
  deprecated?: boolean;
  /** Deprecation message */
  deprecationMessage?: string;
}

/**
 * Distribution info
 */
export interface DistInfo {
  /** Download URL */
  tarball: string;
  /** SHA-256 checksum */
  shasum: string;
  /** Size in bytes */
  size?: number;
  /** File count */
  fileCount?: number;
}

/**
 * Registry metadata
 */
export interface RegistryMetadata {
  /** Registry name */
  name: string;
  /** Registry URL */
  url: string;
  /** Registry version */
  version: string;
  /** Description */
  description?: string;
  /** Contact email */
  contact?: string;
  /** Documentation URL */
  documentation?: string;
  /** Health status */
  healthy: boolean;
}

/**
 * Registry authentication info
 */
export interface RegistryAuthInfo {
  /** Auth type */
  type: 'token' | 'basic' | 'oauth' | 'none';
  /** Token (if type=token) */
  token?: string;
  /** Username (if type=basic) */
  username?: string;
  /** Password (if type=basic) */
  password?: string;
  /** OAuth token (if type=oauth) */
  oauthToken?: string;
  /** Token expiry */
  expiresAt?: Date;
}

/**
 * Registry configuration
 */
export interface RegistryConfig {
  /** Registry name */
  name: string;
  /** Registry URL */
  url: string;
  /** Authentication */
  auth?: RegistryAuthInfo;
  /** Priority (higher = preferred) */
  priority?: number;
  /** Verify SSL */
  verifySsl?: boolean;
  /** Timeout (ms) */
  timeout?: number;
  /** Retry attempts */
  retries?: number;
  /** Extensible config */
  [key: string]: unknown;
}
