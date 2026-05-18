import * as vscode from 'vscode';
import {
  AistackWorkspace,
  addModuleWithTarget,
  getProfileWorkspace,
  getProjectWorkspace,
  hasProfileSpec,
  listAllOutputPaths,
  listAllSpecModules,
  searchCatalog,
  type SpecTarget,
} from 'ai-stack-kit-core';

let cachedProject: AistackWorkspace | undefined;

export type { SpecTarget };

export function getWorkspaceFolder(): vscode.Uri | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri;
}

export function getProjectRoot(): string | undefined {
  return getWorkspaceFolder()?.fsPath;
}

export function getAistackWorkspace(): AistackWorkspace | undefined {
  const root = getProjectRoot();
  if (!root) return undefined;
  if (!cachedProject || cachedProject.projectRoot !== root) {
    cachedProject = getProjectWorkspace(root);
  }
  return cachedProject;
}

export function resetWorkspaceCache(): void {
  cachedProject = undefined;
}

export function requireWorkspace(): AistackWorkspace {
  const ws = getAistackWorkspace();
  if (!ws) {
    throw new Error('Open a folder workspace first.');
  }
  return ws;
}

export {
  addModuleWithTarget,
  getProfileWorkspace,
  hasProfileSpec,
  listAllOutputPaths,
  listAllSpecModules,
  searchCatalog,
};
