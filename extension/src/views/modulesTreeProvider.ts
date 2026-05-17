import * as vscode from 'vscode';
import { getAistackWorkspace } from '../services/workspaceService.js';

export class ModuleTreeItem extends vscode.TreeItem {
  constructor(
    public readonly moduleName: string,
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly enabled: boolean
  ) {
    super(label, collapsibleState);
    this.contextValue = 'module';
    this.iconPath = enabled
      ? new vscode.ThemeIcon('check')
      : new vscode.ThemeIcon('circle-outline');
  }
}

export class ModulesTreeProvider implements vscode.TreeDataProvider<ModuleTreeItem | vscode.TreeItem> {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  refresh(): void {
    this._onDidChange.fire();
  }

  getTreeItem(element: ModuleTreeItem | vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ModuleTreeItem | vscode.TreeItem): Promise<(ModuleTreeItem | vscode.TreeItem)[]> {
    const ws = getAistackWorkspace();
    if (!ws) {
      return [new vscode.TreeItem('Open a folder to use AI Stack Kit')];
    }
    if (!ws.hasSpec()) {
      return [new vscode.TreeItem('No spec.yaml — run Initialize Workspace')];
    }

    if (!element) {
      const modules = await ws.listSpecModules();
      const groups = new Map<string, typeof modules>();
      for (const m of modules) {
        const t = m.moduleType || 'skill';
        if (!groups.has(t)) groups.set(t, []);
        groups.get(t)!.push(m);
      }
      const roots: vscode.TreeItem[] = [];
      for (const [type, items] of groups) {
        const header = new vscode.TreeItem(type, vscode.TreeItemCollapsibleState.Expanded);
        header.description = `${items.length}`;
        (header as { typeKey?: string }).typeKey = type;
        roots.push(header);
      }
      return roots.length ? roots : [new vscode.TreeItem('No modules in spec — use Catalog or Search')];
    }

    const typeKey = (element as { typeKey?: string }).typeKey;
    if (typeKey) {
      const modules = await ws.listSpecModules();
      return modules
        .filter((m) => (m.moduleType || 'skill') === typeKey)
        .map(
          (m) =>
            new ModuleTreeItem(
              m.name,
              m.name,
              vscode.TreeItemCollapsibleState.None,
              (m.enabled ?? true) === true
            )
        );
    }

    return [];
  }
}
