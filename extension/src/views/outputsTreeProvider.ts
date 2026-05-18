import * as vscode from 'vscode';
import { getProjectRoot, listAllOutputPaths } from '../services/workspaceService.js';
import { hasProfileSpec } from 'ai-stack-kit-core';

export class OutputsTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  refresh(): void {
    this._onDidChange.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<vscode.TreeItem[]> {
    const projectRoot = getProjectRoot();
    if (!projectRoot && !hasProfileSpec()) {
      return [new vscode.TreeItem('Open a folder or add profile modules')];
    }

    const paths = await listAllOutputPaths(projectRoot);
    if (!paths.length) {
      return [new vscode.TreeItem('No spec — initialize or add profile modules')];
    }

    return paths.map((p) => {
      const item = new vscode.TreeItem(p.label, vscode.TreeItemCollapsibleState.None);
      item.description = p.relativePath;
      item.tooltip = p.absolutePath;
      if (p.exists) {
        item.resourceUri = vscode.Uri.file(p.absolutePath);
        item.command = {
          command: 'vscode.open',
          title: 'Open',
          arguments: [item.resourceUri],
        };
      } else {
        item.iconPath = new vscode.ThemeIcon('warning');
        item.description = `${p.relativePath} (not created — run Sync)`;
      }
      return item;
    });
  }
}
