/**
 * IDEAdapter Interface
 * 
 * Abstraction for applying skills to different IDEs (Cursor, VSCode, etc.)
 */

import { SkillContent, InstalledSkill } from '../../types/skill.js';

export interface IDEAdapter {
  /** IDE name */
  readonly name: string;
  
  /** Features supported by this IDE */
  readonly supportedFeatures: IDEFeature[];
  
  /**
   * Detect if this IDE is installed and get its configuration
   * 
   * @returns Detection result with version and paths
   */
  detect(): Promise<IDEDetectionResult>;
  
  /**
   * Validate IDE environment
   * 
   * @returns Validation result with any issues found
   */
  validate(): Promise<ValidationResult>;
  
  /**
   * Apply a skill to the IDE
   * 
   * @param skill - Skill content to apply
   * @param options - Apply options
   * @returns Result with files written and any errors
   */
  applySkill(skill: SkillContent, options?: ApplyOptions): Promise<ApplyResult>;
  
  /**
   * Remove a skill from the IDE
   * 
   * @param skillId - ID of skill to remove
   * @returns Result of removal operation
   */
  removeSkill(skillId: string): Promise<RemoveResult>;
  
  /**
   * List currently installed skills
   * 
   * @returns Array of installed skills
   */
  listInstalledSkills(): Promise<InstalledSkill[]>;
  
  /**
   * Sync IDE state with desired skills
   * 
   * @param skills - Desired skill set
   * @returns Sync result showing changes
   */
  sync(skills: SkillContent[]): Promise<SyncResult>;
  
  /**
   * Get IDE-specific configuration path
   * 
   * @returns Path to IDE config directory
   */
  getConfigPath(): Promise<string>;
  
  /**
   * Backup current IDE configuration
   * 
   * @returns Path to backup file
   */
  backup?(): Promise<string>;
  
  /**
   * Restore IDE configuration from backup
   * 
   * @param backupPath - Path to backup file
   */
  restore?(backupPath: string): Promise<void>;
}

export type IDEFeature = 
  | 'skills'      // Skill support
  | 'rules'       // Rule files
  | 'hooks'       // Lifecycle hooks
  | 'settings'    // Settings management
  | 'extensions'  // Extension management
  | 'snippets'    // Code snippets
  | 'themes';     // Theme support

export interface IDEDetectionResult {
  /** IDE detected */
  detected: boolean;
  /** IDE version */
  version?: string;
  /** Main config directory path */
  configPath?: string;
  /** User-specific config path */
  userPath?: string;
  /** Workspace config path */
  workspacePath?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface ValidationResult {
  /** Overall validation status */
  valid: boolean;
  /** Validation issues */
  issues?: ValidationIssue[];
  /** Warnings (non-blocking) */
  warnings?: string[];
}

export interface ValidationIssue {
  /** Severity level */
  severity: 'error' | 'warning';
  /** Issue message */
  message: string;
  /** How to fix */
  fix?: string;
  /** Related file/path */
  path?: string;
}

export interface ApplyOptions {
  /** Force overwrite existing files */
  force?: boolean;
  /** Dry run (don't write files) */
  dryRun?: boolean;
  /** Backup before applying */
  backup?: boolean;
  /** Skip validation */
  skipValidation?: boolean;
}

export interface ApplyResult {
  /** Success status */
  success: boolean;
  /** Skill ID that was applied */
  skillId: string;
  /** Files written */
  filesWritten: string[];
  /** Files skipped (already exist) */
  filesSkipped?: string[];
  /** Errors encountered */
  errors?: Error[];
  /** Backup path (if created) */
  backupPath?: string;
}

export interface RemoveResult {
  /** Success status */
  success: boolean;
  /** Skill ID that was removed */
  skillId: string;
  /** Files deleted */
  filesDeleted: string[];
  /** Errors encountered */
  errors?: Error[];
}

export interface SyncResult {
  /** Skills added */
  added: string[];
  /** Skills updated */
  updated: string[];
  /** Skills removed */
  removed: string[];
  /** Skills unchanged */
  unchanged: string[];
  /** Errors encountered */
  errors?: Error[];
}

/**
 * Base class for IDE adapters (optional convenience)
 */
export abstract class BaseIDEAdapter implements IDEAdapter {
  constructor(
    public readonly name: string,
    public readonly supportedFeatures: IDEFeature[]
  ) {}
  
  abstract detect(): Promise<IDEDetectionResult>;
  abstract validate(): Promise<ValidationResult>;
  abstract applySkill(skill: SkillContent, options?: ApplyOptions): Promise<ApplyResult>;
  abstract removeSkill(skillId: string): Promise<RemoveResult>;
  abstract listInstalledSkills(): Promise<InstalledSkill[]>;
  abstract sync(skills: SkillContent[]): Promise<SyncResult>;
  abstract getConfigPath(): Promise<string>;
  
  /**
   * Helper to check if a feature is supported
   */
  protected supportsFeature(feature: IDEFeature): boolean {
    return this.supportedFeatures.includes(feature);
  }
  
  /**
   * Helper to validate skill compatibility
   */
  protected validateSkillCompatibility(skill: SkillContent): ValidationResult {
    const issues: ValidationIssue[] = [];
    
    // Check if skill requires unsupported features
    const requiredFeatures = skill.manifest.features || [];
    for (const feature of requiredFeatures) {
      if (!this.supportedFeatures.includes(feature as IDEFeature)) {
        issues.push({
          severity: 'error',
          message: `Skill requires unsupported feature: ${feature}`,
          fix: `This skill is not compatible with ${this.name}`
        });
      }
    }
    
    return {
      valid: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined
    };
  }
  
  /**
   * Helper to resolve IDE paths
   */
  protected async resolveConfigPath(basePath: string, ...segments: string[]): Promise<string> {
    const path = require('path');
    return path.join(basePath, ...segments);
  }
}
