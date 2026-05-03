/**
 * Multi-client adapter layer — normalized workspace → client files.
 *
 * Pipeline: `normalizeWorkspaceInput` → `ClientAdapter.generateConfig` → `applyAdapterOutput`.
 */

export type {
  NormalizedWorkspaceInput,
  ResolvedSkill,
  AgentDefinition,
  ToolDefinition,
  NormalizedPrompt,
  WorkspaceMetadata,
} from './normalized.js';
export { normalizeWorkspaceInput, type NormalizeOptions } from './normalize.js';
export type { ClientAdapter } from './client-adapter.js';
export type {
  AdapterOutput,
  AdapterOutputFile,
  MergeStrategy,
  AdapterApplyOptions,
  AdapterApplyReport,
} from './adapter-output.js';
export { AdapterFactory } from './adapter-factory.js';
export { BaseClientAdapter } from './base-client-adapter.js';
export { applyAdapterOutput, applyFiles } from './apply-output.js';
export { deepMerge, parseJsonSafe, stringifyJsonSorted } from './merge-json.js';
export {
  templatesRoot,
  loadClientTemplate,
  renderTemplate,
  bundledTemplatesDir,
  loadBundledTemplate,
} from './template-loader.js';
export { CursorClientAdapter } from './cursor/cursor-adapter.js';
export { ClaudeClientAdapter } from './claude/claude-adapter.js';
export { CopilotClientAdapter } from './copilot/copilot-adapter.js';
