import * as vscode from 'vscode';
import { AistackWorkspace } from 'ai-stack-kit-core';

let cached: AistackWorkspace | undefined;

export function getWorkspaceFolder(): vscode.Uri | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri;
}

export function getAistackWorkspace(): AistackWorkspace | undefined {
  const folder = getWorkspaceFolder();
  if (!folder) return undefined;
  const root = folder.fsPath;
  if (!cached || cached.projectRoot !== root) {
    cached = new AistackWorkspace(root);
  }
  return cached;
}

export function resetWorkspaceCache(): void {
  cached = undefined;
}

export function requireWorkspace(): AistackWorkspace {
  const ws = getAistackWorkspace();
  if (!ws) {
    throw new Error('Open a folder workspace first.');
  }
  return ws;
}
