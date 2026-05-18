import * as vscode from 'vscode';
import {
  getProjectRoot,
  hasProfileSpec,
  listAllSpecModules,
  type SpecTarget,
} from '../services/workspaceService.js';
import { getProjectWorkspace } from 'ai-stack-kit-core';

export class ModuleTreeItem extends vscode.TreeItem {
  constructor(
    public readonly moduleName: string,
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly enabled: boolean,
    public readonly specTarget: SpecTarget
  ) {
    super(label, collapsibleState);
    this.contextValue = 'module';
    this.iconPath = enabled
      ? new vscode.ThemeIcon('check')
      : new vscode.ThemeIcon('circle-outline');
  }
}

export type ModuleGroupHeader = vscode.TreeItem & { groupKey: SpecTarget };

function groupHeader(
  label: string,
  groupKey: SpecTarget,
  description: string,
  expanded: boolean
): ModuleGroupHeader {
  const h = new vscode.TreeItem(
    label,
    expanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None
  ) as ModuleGroupHeader;
  h.groupKey = groupKey;
  h.description = description;
  h.iconPath = new vscode.ThemeIcon(groupKey === 'project' ? 'root-folder' : 'account');
  return h;
}

export class ModulesTreeProvider implements vscode.TreeDataProvider<ModuleTreeItem | ModuleGroupHeader> {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  refresh(): void {
    this._onDidChange.fire();
  }

  getTreeItem(element: ModuleTreeItem | ModuleGroupHeader): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: ModuleTreeItem | ModuleGroupHeader
  ): Promise<(ModuleTreeItem | ModuleGroupHeader)[]> {
    if (element && 'groupKey' in element) {
      const modules = await listAllSpecModules(getProjectRoot());
      return modules
        .filter((m) => m.specTarget === element.groupKey)
        .map(
          (m) =>
            new ModuleTreeItem(
              m.name,
              m.name,
              vscode.TreeItemCollapsibleState.None,
              m.enabled !== false,
              m.specTarget
            )
        );
    }

    const projectRoot = getProjectRoot();
    const headers: ModuleGroupHeader[] = [];

    if (projectRoot) {
      const projectWs = getProjectWorkspace(projectRoot);
      if (projectWs.hasSpec()) {
        headers.push(groupHeader('Project', 'project', 'repo spec.yaml', true));
      } else {
        const h = groupHeader('Project', 'project', 'run Initialize', false);
        h.description = 'run Initialize';
        headers.push(h);
      }
    } else {
      const h = new vscode.TreeItem(
        'Project',
        vscode.TreeItemCollapsibleState.None
      ) as ModuleGroupHeader;
      h.description = 'open a folder';
      h.iconPath = new vscode.ThemeIcon('root-folder');
      headers.push(h);
    }

    if (hasProfileSpec()) {
      headers.push(groupHeader('Profile', 'profile', '~/.aistack/spec.yaml', true));
    } else {
      const h = groupHeader('Profile', 'profile', 'use Add to profile in Catalog', false);
      headers.push(h);
    }

    return headers;
  }
}
