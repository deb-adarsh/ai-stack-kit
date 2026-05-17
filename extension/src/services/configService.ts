import * as vscode from 'vscode';

export type ClientType = 'cursor' | 'copilot' | 'claude';

export function getExtensionConfig() {
  const cfg = vscode.workspace.getConfiguration('aiStackKit');
  return {
    clientType: (cfg.get<string>('clientType') ?? 'copilot') as ClientType,
    installScope: (cfg.get<string>('installScope') ?? 'project') as 'project' | 'user',
    githubToken: cfg.get<string>('githubToken') ?? '',
    autoSyncOnSave: cfg.get<boolean>('autoSyncOnSave') ?? false,
    dryRun: cfg.get<boolean>('dryRun') ?? false,
  };
}

/** Apply GitHub token from settings to process env for catalog API calls. */
export function applyGithubTokenFromSettings(): void {
  const token = getExtensionConfig().githubToken?.trim();
  if (token) {
    process.env.GITHUB_TOKEN = token;
  }
}
