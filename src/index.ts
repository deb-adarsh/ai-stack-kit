/**
 * Programmatic API for AI Stack Kit (VS Code extension, embedders).
 */

export { AistackWorkspace } from './api/workspace-api.js';
export { runCatalogRefreshCore } from './api/catalog-refresh-core.js';
export { createCallbackLogger } from './api/callback-logger.js';
export { ensureProfileSpec } from './api/profile-spec.js';
export {
  addModuleWithTarget,
  getProfileWorkspace,
  getProjectWorkspace,
  listAllOutputPaths,
  listAllSpecModules,
  resolveWorkspaceForTarget,
  searchCatalog,
  syncAllScopes,
} from './api/workspace-facade.js';
export {
  hasProfileSpec,
  userAistackRoot,
  userSpecPath,
} from './paths/aistack-paths.js';
export * from './api/types.js';

export { loadSpec } from './pipeline/spec-loader.js';
export { apply, type ApplyPipelineOptions, type ApplyPipelineResult } from './pipeline/apply-pipeline.js';
export { createConsoleLogger, type Logger, type LogLevel } from './pipeline/logger.js';

export { AdapterFactory } from './client-adapters/adapter-factory.js';
export { runDoctor, type DoctorCheck } from './cli/doctor.js';
