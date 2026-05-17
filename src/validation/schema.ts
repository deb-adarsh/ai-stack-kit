/**
 * Validation schemas using Zod
 * 
 * Provides runtime validation for spec.yaml and other configurations
 */

import { z } from 'zod';

export const AIModuleTypeSchema = z.enum(['skill', 'subagent', 'hook']);

/**
 * Source type schema - extensible
 */
export const SourceTypeSchema = z.union([
  z.literal('github'),
  z.literal('npm'),
  z.literal('registry'),
  z.literal('local'),
  z.literal('git'),
  z.literal('http'),
  z.string(), // Allow custom source types
]);

/**
 * Source configuration schema - extensible
 */
export const SourceConfigSchema = z.object({
  // GitHub
  owner: z.string().optional(),
  repo: z.string().optional(),
  branch: z.string().optional(),
  path: z.string().optional(),
  token: z.string().optional(),
  
  // npm
  registry: z.string().url().optional(),
  scope: z.string().optional(),
  
  // Registry
  registryUrl: z.string().url().optional(),
  registryName: z.string().optional(),
  
  // Local
  localPath: z.string().optional(),
  
  // Git
  gitUrl: z.string().url().optional(),
  ref: z.string().optional(),
  
  // HTTP
  url: z.string().url().optional(),
  headers: z.record(z.string()).optional(),
}).catchall(z.unknown()); // Allow additional fields

/**
 * Skill reference schema
 */
export const SkillReferenceSchema = z.object({
  name: z.string().min(1),
  version: z.string().optional(),
  source: SourceTypeSchema,
  sourceConfig: SourceConfigSchema.optional(),
});

/**
 * Skill configuration schema - fully extensible
 */
export const SkillConfigSchema = z.record(z.unknown());

/**
 * Skill schema
 */
export const SkillSchema = z.object({
  name: z.string().min(1),
  version: z.string().optional(),
  source: SourceTypeSchema,
  sourceConfig: SourceConfigSchema.optional(),
  config: SkillConfigSchema.optional(),
  dependencies: z.array(SkillReferenceSchema).optional(),
  enabled: z.boolean().optional().default(true),
  moduleType: AIModuleTypeSchema.optional(),
});

/**
 * Client type schema - extensible
 */
export const ClientTypeSchema = z.union([
  z.literal('cursor'),
  z.literal('vscode'),
  z.literal('claude'),
  z.literal('copilot'),
  z.literal('intellij'),
  z.literal('vim'),
  z.literal('neovim'),
  z.literal('emacs'),
  z.string(), // Allow custom clients
]);

/**
 * Client feature schema - extensible
 */
export const ClientFeatureSchema = z.union([
  z.literal('skills'),
  z.literal('rules'),
  z.literal('hooks'),
  z.literal('settings'),
  z.literal('extensions'),
  z.literal('snippets'),
  z.literal('themes'),
  z.string(), // Allow custom features
]);

/**
 * Adapter options schema
 */
export const AdapterOptionsSchema = z.object({
  backup: z.boolean().optional(),
  mergeStrategy: z.enum(['replace', 'merge', 'append']).optional(),
  dryRun: z.boolean().optional(),
}).catchall(z.unknown()); // Extensible

export const ClientInstallScopeSchema = z.enum(['project', 'user']);

/**
 * Client configuration schema
 */
export const ClientConfigSchema = z.object({
  type: ClientTypeSchema,
  installScope: ClientInstallScopeSchema.optional(),
  version: z.string().optional(),
  configDir: z.string().optional(),
  features: z.array(ClientFeatureSchema).optional(),
  settings: z.record(z.unknown()).optional(),
  adapter: AdapterOptionsSchema.optional(),
});

/**
 * Project metadata schema
 */
export const ProjectMetadataSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  author: z.string().optional(),
  repository: z.string().url().optional(),
  license: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Lifecycle hooks schema
 */
export const LifecycleHooksSchema = z.object({
  preInstall: z.array(z.string()).optional(),
  postInstall: z.array(z.string()).optional(),
  preApply: z.array(z.string()).optional(),
  postApply: z.array(z.string()).optional(),
  preUninstall: z.array(z.string()).optional(),
  postUninstall: z.array(z.string()).optional(),
});

/**
 * Global settings schema
 */
export const SpecSettingsSchema = z.object({
  cacheDir: z.string().optional(),
  lockFile: z.string().optional(),
  stateDir: z.string().optional(),
  autoSync: z.boolean().optional(),
  concurrency: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
  retries: z.number().int().nonnegative().optional(),
  verifyChecksums: z.boolean().optional(),
  offline: z.boolean().optional(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).optional(),
}).catchall(z.unknown()); // Extensible

/**
 * Main spec file schema
 */
export const SpecFileSchema = z.object({
  version: z.string().regex(/^\d+\.\d+$/, 'Version must be in format X.Y'),
  project: ProjectMetadataSchema.optional(),
  client: ClientConfigSchema,
  skills: z.array(SkillSchema).default([]),
  modules: z.array(SkillSchema).default([]),
  settings: SpecSettingsSchema.optional(),
  hooks: LifecycleHooksSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Skill manifest schema
 */
export const SkillManifestSchema = z.object({
  manifestVersion: z.string(),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Version must be semver'),
  description: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  supportedClients: z.array(z.string()).optional(),
  clientConfig: z.record(z.unknown()).optional(),
  dependencies: z.record(z.string()).optional(),
  main: z.string().optional(),
  files: z.array(z.string()).optional(),
  hooks: LifecycleHooksSchema.optional(),
}).catchall(z.unknown()); // Extensible for future fields

/**
 * Registry entry schema
 */
export const RegistryEntrySchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  tags: z.array(z.string()),
  supportedClients: z.array(z.string()),
  source: z.object({
    type: z.string(),
    url: z.string(),
    config: z.record(z.unknown()).optional(),
  }),
  versions: z.array(z.string()),
  latest: z.string(),
  author: z.string().optional(),
  license: z.string().optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  stats: z.object({
    downloads: z.number().int().nonnegative(),
    weeklyDownloads: z.number().int().nonnegative(),
    monthlyDownloads: z.number().int().nonnegative(),
    stars: z.number().int().nonnegative().optional(),
    forks: z.number().int().nonnegative().optional(),
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Validation helper function
 */
export function validateSpec(spec: unknown): { 
  success: boolean; 
  data?: z.infer<typeof SpecFileSchema>; 
  errors?: z.ZodError 
} {
  try {
    const data = SpecFileSchema.parse(spec);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Validation helper for skill manifest
 */
export function validateSkillManifest(manifest: unknown): {
  success: boolean;
  data?: z.infer<typeof SkillManifestSchema>;
  errors?: z.ZodError;
} {
  try {
    const data = SkillManifestSchema.parse(manifest);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Type exports for TypeScript
 */
export type ValidatedSpecFile = z.infer<typeof SpecFileSchema>;
export type ValidatedSkill = z.infer<typeof SkillSchema>;
export type ValidatedClientConfig = z.infer<typeof ClientConfigSchema>;
export type ValidatedSkillManifest = z.infer<typeof SkillManifestSchema>;
export type ValidatedRegistryEntry = z.infer<typeof RegistryEntrySchema>;
