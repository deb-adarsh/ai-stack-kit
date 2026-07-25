/**
 * Multi-client adapter layer — fetched modules → client files.
 *
 * Pipeline: resolve/fetch modules → `normalizeWorkspaceInput` → `ClientAdapter.generateConfig` → `applyAdapterOutput`.
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
export {
  adapterFilesystemRoot,
  agentsDirRelative,
  hooksDirRelative,
  resolveInstallScope,
  skillsDirRelative,
} from './client-paths.js';
export type { ClientInstallScope } from '../types/spec.js';
export {
  copilotAgentBasename,
  cursorStyleAgentBasename,
  emitHookTreeFiles,
  emitModuleTreeFiles,
  emitSkillTreeFiles,
  emitSubagentTreeFiles,
  moduleInstallFolderName,
  partitionModulesByType,
  partitionSkillsAndHooks,
  sanitizePathSegment,
  skillInstallFolderName,
} from './emit-skill-agent-files.js';
