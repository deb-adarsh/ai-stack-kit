import * as vscode from 'vscode';
import * as path from 'path';
import { getAistackWorkspace } from '../services/workspaceService.js';

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
    const ws = getAistackWorkspace();
    if (!ws) {
      return [new vscode.TreeItem('Open a folder to use AI Stack Kit')];
    }
    if (!ws.hasSpec()) {
      return [new vscode.TreeItem('No spec.yaml')];
    }

    const paths = await ws.listOutputPaths();
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
