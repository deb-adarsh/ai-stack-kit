/**
 * CLI configuration types
 */

export interface CLIConfig {
  /** CLI version */
  version: string;
  /** User preferences */
  preferences?: UserPreferences;
  /** Global settings */
  global?: GlobalSettings;
  /** Configured registries */
  registries?: ConfiguredRegistry[];
}

export interface UserPreferences {
  /** Default IDE */
  defaultIDE?: string;
  /** Auto-sync on changes */
  autoSync?: boolean;
  /** Show verbose output */
  verbose?: boolean;
  /** Color output */
  color?: boolean;
  /** Spinner style */
  spinner?: string;
  /** Editor for interactive editing */
  editor?: string;
}

export interface GlobalSettings {
  /** Global cache directory */
  cacheDir?: string;
  /** Global config directory */
  configDir?: string;
  /** Telemetry opt-in */
  telemetry?: boolean;
  /** Update check frequency */
  updateCheck?: 'daily' | 'weekly' | 'never';
}

export interface ConfiguredRegistry {
  name: string;
  url: string;
  token?: string;
  default?: boolean;
}

export interface CLIContext {
  /** Current working directory */
  cwd: string;
  /** Config file path */
  configPath?: string;
  /** Spec file path */
  specPath?: string;
  /** Lock file path */
  lockPath?: string;
  /** Cache directory */
  cacheDir: string;
  /** CLI config */
  config: CLIConfig;
}

/**
 * Environment variable names used by the CLI
 */
export const ENV_VARS = {
  /** Override cache directory */
  CACHE_DIR: 'AISTACK_CACHE_DIR',
  /** Override config directory */
  CONFIG_DIR: 'AISTACK_CONFIG_DIR',
  /** Default registry token */
  TOKEN: 'AISTACK_TOKEN',
  /** Log level */
  LOG_LEVEL: 'AISTACK_LOG_LEVEL',
  /** Disable telemetry */
  NO_TELEMETRY: 'AISTACK_NO_TELEMETRY',
  /** Disable update checks */
  NO_UPDATE_CHECK: 'AISTACK_NO_UPDATE_CHECK',
} as const;
