/** Ambient types for the bundled core (resolved at runtime via esbuild alias). */
declare module 'ai-stack-kit-core' {
  export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

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
    enabled?: boolean;
    moduleType?: string;
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
    listSpecModules(): Promise<SpecModuleRow[]>;
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
}
