/**
 * Optional base: shared {@link ClientAdapter.apply} via {@link applyAdapterOutput}.
 */

import type { ClientAdapter } from './client-adapter.js';
import type { AdapterApplyOptions, AdapterApplyReport, AdapterOutput } from './adapter-output.js';
import { applyAdapterOutput } from './apply-output.js';
import type { NormalizedWorkspaceInput } from './normalized.js';

export abstract class BaseClientAdapter implements ClientAdapter {
  abstract readonly name: string;
  abstract supports(clientType: string): boolean;
  abstract generateConfig(input: NormalizedWorkspaceInput): AdapterOutput;

  async apply(
    output: AdapterOutput,
    projectPath: string,
    options?: AdapterApplyOptions
  ): Promise<AdapterApplyReport> {
    return applyAdapterOutput(output, projectPath, options);
  }
}
