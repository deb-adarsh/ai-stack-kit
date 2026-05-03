/**
 * Npm-style registry (publish / tarball / semver).
 * For skill discovery (search / getSkill), see `../discovery/registry-provider.js`.
 */

import { SkillContent } from '../../types/skill.js';

export interface NpmRegistryProvider {
  /** Registry name */
  readonly name: string;
  
  /** Registry URL */
  readonly url: string;
  
  /**
   * Search for skills in the registry
   * 
   * @param query - Search query string
   * @param options - Search options
   * @returns Array of search results
   */
  search(query: string, options?: SearchOptions): Promise<RegistrySearchResult[]>;
  
  /**
   * Get full package metadata
   * 
   * @param name - Package name
   * @returns Complete package information
   * @throws Error if package not found
   */
  getPackageInfo(name: string): Promise<PackageInfo>;
  
  /**
   * Get specific version metadata
   * 
   * @param name - Package name
   * @param version - Specific version
   * @returns Version-specific information
   * @throws Error if version not found
   */
  getVersionInfo(name: string, version: string): Promise<VersionInfo>;
  
  /**
   * Resolve version range to concrete version
   * 
   * @param name - Package name
   * @param versionRange - Semver range (e.g., '^1.0.0', '~2.1.0', 'latest')
   * @returns Concrete version string
   * @throws Error if no matching version found
   */
  resolveVersion(name: string, versionRange: string): Promise<string>;
  
  /**
   * Publish a skill to the registry
   * 
   * @param skill - Skill content to publish
   * @param options - Publish options
   * @returns Publish result
   * @throws Error if publish fails
   */
  publish(skill: SkillContent, options?: PublishOptions): Promise<PublishResult>;
  
  /**
   * Authenticate with the registry
   * 
   * @param token - Authentication token
   * @returns true if authentication successful
   */
  authenticate(token: string): Promise<boolean>;
  
  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean;
}

export interface SearchOptions {
  /** Maximum number of results */
  limit?: number;
  /** Result offset (for pagination) */
  offset?: number;
  /** Filter by tags */
  tags?: string[];
  /** Filter by author */
  author?: string;
  /** Sort order */
  sortBy?: 'relevance' | 'downloads' | 'updated' | 'created';
}

export interface RegistrySearchResult {
  /** Package name */
  name: string;
  /** Description */
  description?: string;
  /** Latest version */
  version: string;
  /** Author */
  author?: string;
  /** Tags */
  tags?: string[];
  /** Download count */
  downloads?: number;
  /** Last updated */
  updatedAt?: Date;
  /** Relevance score (0-1) */
  score?: number;
}

export interface PackageInfo {
  /** Package name */
  name: string;
  /** Description */
  description?: string;
  /** All available versions */
  versions: string[];
  /** Version tags (e.g., 'latest' -> '1.2.3') */
  tags: Record<string, string>;
  /** Repository URL */
  repository?: string;
  /** Homepage URL */
  homepage?: string;
  /** Author */
  author?: string;
  /** License */
  license?: string;
  /** Keywords/tags */
  keywords?: string[];
  /** Creation date */
  createdAt?: Date;
  /** Last update date */
  updatedAt?: Date;
}

export interface VersionInfo {
  /** Package name */
  name: string;
  /** Version */
  version: string;
  /** Description */
  description?: string;
  /** Dependencies */
  dependencies?: Record<string, string>;
  /** Distribution info */
  dist: DistInfo;
  /** Main entry file */
  main?: string;
  /** Files included */
  files?: string[];
  /** Author */
  author?: string;
  /** License */
  license?: string;
  /** Publish date */
  publishedAt?: Date;
}

export interface DistInfo {
  /** Tarball URL */
  tarball: string;
  /** SHA-256 checksum */
  shasum: string;
  /** File size in bytes */
  size?: number;
}

export interface PublishOptions {
  /** Version tag (e.g., 'latest', 'beta') */
  tag?: string;
  /** Access level */
  access?: 'public' | 'private';
  /** Override existing version */
  force?: boolean;
  /** Dry run (don't actually publish) */
  dryRun?: boolean;
}

export interface PublishResult {
  /** Success status */
  success: boolean;
  /** Package name */
  name: string;
  /** Published version */
  version: string;
  /** Registry URL for the package */
  url?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Base class for registry providers (optional convenience)
 */
export abstract class BaseNpmRegistryProvider implements NpmRegistryProvider {
  private authenticated = false;
  
  constructor(
    public readonly name: string,
    public readonly url: string
  ) {}
  
  abstract search(query: string, options?: SearchOptions): Promise<RegistrySearchResult[]>;
  abstract getPackageInfo(name: string): Promise<PackageInfo>;
  abstract getVersionInfo(name: string, version: string): Promise<VersionInfo>;
  abstract resolveVersion(name: string, versionRange: string): Promise<string>;
  abstract publish(skill: SkillContent, options?: PublishOptions): Promise<PublishResult>;
  
  async authenticate(token: string): Promise<boolean> {
    this.authenticated = true;
    return true;
  }
  
  isAuthenticated(): boolean {
    return this.authenticated;
  }
  
  /**
   * Helper to normalize package names
   */
  protected normalizePackageName(name: string): string {
    return name.toLowerCase().trim();
  }
  
  /**
   * Helper to build registry URLs
   */
  protected buildUrl(...paths: string[]): string {
    const base = this.url.replace(/\/$/, '');
    const path = paths.join('/').replace(/^\//, '');
    return `${base}/${path}`;
  }
}
