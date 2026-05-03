/**
 * Adapter output + merge strategies for safe, idempotent applies.
 */

export type MergeStrategy = 'overwrite' | 'merge' | 'append';

export interface AdapterOutputFile {
  /** Path relative to `projectPath` (POSIX-style segments). */
  path: string;
  content: string;
  mergeStrategy: MergeStrategy;
  /**
   * When true, content fully replaces prior managed content for this path
   * (idempotent regenerate). When false, treat as user-owned merge (conservative).
   */
  managed?: boolean;
  /** Optional comment header embedded in text formats for traceability. */
  provenance?: string;
}

export interface AdapterOutput {
  files: AdapterOutputFile[];
  /** Optional diagnostics / warnings (non-fatal). */
  warnings?: string[];
}

export interface AdapterApplyOptions {
  dryRun?: boolean;
  /** If true, fail when merge conflicts are detected instead of writing markers. */
  strictConflicts?: boolean;
}

export interface AdapterApplyReport {
  written: string[];
  skipped: string[];
  merged: string[];
  conflicts?: { path: string; message: string }[];
}
