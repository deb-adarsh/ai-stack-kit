/** Ambient types for the bundled core (resolved at runtime via esbuild alias). */
declare module 'ai-stack-kit-core' {
  export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
  export type SpecTarget = 'project' | 'profile';

  export interface ModuleSearchHit {
    name: string;
    version: string;
    description: string;
    tags: string[];
    downloads?: number;
    source: string;
    repository?: string;
    score?: number;
    origin?: 'catalog' | 'local';
    moduleType?: string;
  }

  export interface DoctorCheck {
    id: string;
    ok: boolean;
    warn?: boolean;
    message: string;
    hint?: string;
  }

  export interface ApplyPipelineResult {
    success: boolean;
    skillsResolved: number;
    errors: { phase?: string; skill?: string; message: string }[];
    adapterReport?: { written: string[] };
  }

  export interface SpecModuleRow {
    name: string;
    enabled: boolean;
    moduleType?: string;
    specTarget: SpecTarget;
  }

  export interface AddModuleOptions {
    name: string;
    version?: string;
    source?: string;
    sourceConfig?: Record<string, unknown>;
    config?: unknown;
    moduleType?: string;
    specTarget?: SpecTarget;
    clientInstallScope?: string;
  }

  export interface DualSyncResult {
    project?: ApplyPipelineResult;
    profile?: ApplyPipelineResult;
  }

  export class AistackWorkspace {
    constructor(projectRoot: string);
    readonly projectRoot: string;
    readonly specPath: string;
    hasSpec(): boolean;
    init(options: {
      clientType: string;
      installScope?: string;
      skills?: string[];
    }): Promise<void>;
    readSpec(): Promise<{ client: { type: string } }>;
    listSpecModules(): Promise<Omit<SpecModuleRow, 'specTarget'>[]>;
    syncWithLogger(
      options: { dryRun?: boolean; verbose?: boolean },
      onLog: (level: LogLevel, message: string, meta?: Record<string, unknown>) => void
    ): Promise<ApplyPipelineResult>;
    doctor(): Promise<{ checks: DoctorCheck[]; ok: boolean }>;
    search(query: string, opts?: { limit?: number }): Promise<ModuleSearchHit[]>;
    addModule(options: {
      name: string;
      version?: string;
      source?: string;
      moduleType?: string;
    }): Promise<void>;
    removeModule(name: string): Promise<void>;
    setModuleEnabled(name: string, enabled: boolean): Promise<void>;
    setClientType(type: string, installScope: string): Promise<void>;
    catalogRefresh(options?: { write?: boolean }): Promise<{ candidateNames: string[] }>;
    listOutputPaths(): Promise<{ label: string; relativePath: string; absolutePath: string; exists: boolean }[]>;
  }

  export function getProjectWorkspace(projectRoot: string): AistackWorkspace;
  export function getProfileWorkspace(): AistackWorkspace;
  export function hasProfileSpec(): boolean;
  export function addModuleWithTarget(
    opts: AddModuleOptions,
    projectRoot?: string
  ): Promise<{ workspace: AistackWorkspace; target: SpecTarget }>;
  export function listAllSpecModules(projectRoot?: string): Promise<SpecModuleRow[]>;
  export function listAllOutputPaths(
    projectRoot?: string
  ): Promise<{ label: string; relativePath: string; absolutePath: string; exists: boolean }[]>;
  export function syncAllScopes(
    projectRoot: string | undefined,
    options?: { dryRun?: boolean; verbose?: boolean }
  ): Promise<DualSyncResult>;
  export function searchCatalog(
    query: string,
    opts?: { limit?: number },
    projectRoot?: string
  ): Promise<ModuleSearchHit[]>;
  export function userSpecPath(): string;
}
