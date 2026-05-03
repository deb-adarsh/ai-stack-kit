/**
 * ClientAdapter — transforms {@link NormalizedWorkspaceInput} → client-specific files.
 *
 * Pipeline (mandatory): Spec + resolved skills → **Normalizer** → NormalizedWorkspaceInput → **ClientAdapter** → disk
 */

import type { NormalizedWorkspaceInput } from './normalized.js';
import type { AdapterApplyOptions, AdapterApplyReport, AdapterOutput } from './adapter-output.js';

export interface ClientAdapter {
  readonly name: string;

  /** Whether this adapter handles the given `client.type` from spec. */
  supports(clientType: string): boolean;

  /**
   * Pure transform: normalized model → virtual files + merge strategies.
   * Must NOT read/write disk (keeps testable and side-effect free).
   */
  generateConfig(input: NormalizedWorkspaceInput): AdapterOutput;

  /**
   * Materialize {@link AdapterOutput} using merge rules.
   * Paths default to {@link AdapterApplyOptions.adapterFilesystemRoot} (falls back to `projectPath`);
   * use {@link AdapterOutputFile.pathAnchor} `"project"` for workspace-only files (e.g. `.vscode/settings.json`).
   */
  apply(
    output: AdapterOutput,
    projectPath: string,
    options?: AdapterApplyOptions
  ): Promise<AdapterApplyReport>;
}
