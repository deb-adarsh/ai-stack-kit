import type { ApplyPipelineResult } from '../pipeline/apply-pipeline.js';
import type { LogLevel } from '../pipeline/logger.js';
import type { AIModuleType } from '../types/ai-module.js';
import type { ClientInstallScope, SpecFile } from '../types/spec.js';
import type { DoctorCheck } from '../cli/doctor.js';
import type { ModuleSearchHit } from '../cli/commands.js';
import type { ProjectStatusRow } from '../cli/commands.js';

export type { ApplyPipelineResult, SpecFile, AIModuleType, ClientInstallScope };
export type { DoctorCheck, ModuleSearchHit, ProjectStatusRow };

/** Which spec file to target: repo `spec.yaml` vs `~/.aistack/spec.yaml`. */
export type SpecTarget = 'project' | 'profile';

export interface AistackInitOptions {
  clientType: 'cursor' | 'copilot' | 'claude';
  installScope?: 'project' | 'user';
  projectName?: string;
  description?: string;
  author?: string;
  skills?: string[];
}

export interface SyncOptions {
  dryRun?: boolean;
  forceReinstall?: boolean;
  verbose?: boolean;
  logLevel?: LogLevel;
}

export interface SearchOptions {
  limit?: number;
  tags?: string[];
  client?: string;
  moduleTypes?: AIModuleType[];
  offline?: boolean;
}

export interface AddModuleOptions {
  name: string;
  version?: string;
  source?: string;
  sourceConfig?: Record<string, unknown>;
  config?: Record<string, unknown>;
  moduleType?: AIModuleType;
  /** @deprecated Prefer `specTarget: 'profile'` (separate ~/.aistack/spec.yaml). */
  clientInstallScope?: ClientInstallScope;
  /** `project` = workspace spec.yaml; `profile` = ~/.aistack/spec.yaml */
  specTarget?: SpecTarget;
}

export interface CatalogRefreshOptions {
  write?: boolean;
  namesToAppend?: string[];
  refreshSources?: boolean;
  max?: number;
}

export interface CatalogRefreshResult {
  candidateNames: string[];
  added: string[];
  skippedErrors: { name: string; message: string }[];
}

export interface OutputPathEntry {
  label: string;
  relativePath: string;
  absolutePath: string;
  exists: boolean;
}

export interface SpecModuleRow {
  name: string;
  moduleType: string;
  enabled: boolean;
  version: string;
  source: string;
  section: 'skills' | 'modules';
  specTarget: SpecTarget;
}

export interface DualSyncResult {
  project?: ApplyPipelineResult;
  profile?: ApplyPipelineResult;
}
