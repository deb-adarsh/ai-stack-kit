/**
 * Unified AI stack units: skills, subagents, and hooks share transport + registry patterns
 * but differ in manifests and adapter mapping.
 */

/** What kind of AI unit a spec entry or catalog row represents */
export type AIModuleType = 'skill' | 'subagent' | 'hook';

/**
 * Lifecycle slots for hook-style modules (align with spec lifecycle hooks where possible).
 */
export type HookTrigger =
  | 'pre-init'
  | 'post-init'
  | 'pre-install'
  | 'post-install'
  | 'pre-apply'
  | 'post-apply'
  | 'pre-uninstall'
  | 'post-uninstall'
  | string;

/**
 * Normalized catalog / resolution shape (client-agnostic). Adapters still use
 * NormalizedWorkspaceInput built from manifests + files.
 */
export interface AIModule {
  name: string;
  type: AIModuleType;
  description?: string;
  source: {
    type: string;
    ref: string;
  };
  config?: Record<string, unknown>;
  prompts?: string[];
  systemPrompt?: string;
  tools?: string[];
  triggers?: HookTrigger[];
  metadata?: {
    tags?: string[];
    supportedClients?: string[];
    [key: string]: unknown;
  };
}

/** Default when omitted in spec or sources.config */
export const DEFAULT_MODULE_TYPE: AIModuleType = 'skill';
