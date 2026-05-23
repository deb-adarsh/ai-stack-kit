import * as vscode from 'vscode';
import * as os from 'node:os';
import {
  getProjectRoot,
  hasProfileSpec,
  listAllSpecModules,
  type SpecTarget,
} from '../services/workspaceService.js';
import { getProjectWorkspace, userSpecPath } from 'ai-stack-kit-core';

const PROJECT_TOOLTIP_HEADER = '**Project scope** — repo-local';
const PROJECT_TOOLTIP_BODY =
  'Modules recorded in the workspace `spec.yaml`. Sync writes adapter files **inside this repo** ' +
  '(`.cursor/`, `.github/`, `.claude/`). Shared with anyone who clones the repo.\n\n' +
  'CLI: `aistack skill add <name>` (default)';

const PROFILE_TOOLTIP_HEADER = '**Profile scope** — user-global';
const PROFILE_TOOLTIP_BODY =
  'Modules recorded in `~/.aistack/spec.yaml`. Sync writes adapter files to your ' +
  '**user home directory** (`~/.cursor/`, `~/.copilot/`, `~/.claude/`) so they apply across ' +
  'every project on this machine. Not tied to any specific repo.\n\n' +
  'CLI: `aistack skill add <name> --profile`';

function projectTooltip(specFile?: string): vscode.MarkdownString {
  const md = new vscode.MarkdownString(`${PROJECT_TOOLTIP_HEADER}\n\n${PROJECT_TOOLTIP_BODY}`);
  if (specFile) md.appendMarkdown(`\n\nSpec: \`${specFile}\``);
  md.isTrusted = false;
  md.supportHtml = false;
  return md;
}

function profileTooltip(): vscode.MarkdownString {
  const md = new vscode.MarkdownString(
    `${PROFILE_TOOLTIP_HEADER}\n\n${PROFILE_TOOLTIP_BODY}\n\nSpec: \`${userSpecPath()}\``
  );
  md.isTrusted = false;
  md.supportHtml = false;
  return md;
}

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
    this.description = specTarget === 'project' ? 'project' : 'profile';
    this.tooltip =
      specTarget === 'project'
        ? new vscode.MarkdownString(
            `**${moduleName}** — project module\n\nInstalled under this repo on sync.`
          )
        : new vscode.MarkdownString(
            `**${moduleName}** — profile (user-global) module\n\nInstalled under your home directory on sync.`
          );
  }
}

export type ModuleGroupHeader = vscode.TreeItem & { groupKey: SpecTarget };

function groupHeader(
  label: string,
  groupKey: SpecTarget,
  description: string,
  expanded: boolean,
  tooltip: vscode.MarkdownString
): ModuleGroupHeader {
  const h = new vscode.TreeItem(
    label,
    expanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None
  ) as ModuleGroupHeader;
  h.groupKey = groupKey;
  h.description = description;
  h.tooltip = tooltip;
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
    const home = os.homedir();

    if (projectRoot) {
      const projectWs = getProjectWorkspace(projectRoot);
      if (projectWs.hasSpec()) {
        const rel = projectWs.specPath.startsWith(home)
          ? projectWs.specPath.replace(home, '~')
          : projectWs.specPath;
        headers.push(
          groupHeader('Project', 'project', 'repo · syncs into this folder', true, projectTooltip(rel))
        );
      } else {
        headers.push(
          groupHeader(
            'Project',
            'project',
            'run Initialize Workspace',
            false,
            projectTooltip()
          )
        );
      }
    } else {
      const h = new vscode.TreeItem(
        'Project',
        vscode.TreeItemCollapsibleState.None
      ) as ModuleGroupHeader;
      h.description = 'open a folder to use';
      h.iconPath = new vscode.ThemeIcon('root-folder');
      h.tooltip = projectTooltip();
      headers.push(h);
    }

    if (hasProfileSpec()) {
      headers.push(
        groupHeader(
          'Profile',
          'profile',
          'user-global · syncs into your home dir',
          true,
          profileTooltip()
        )
      );
    } else {
      headers.push(
        groupHeader(
          'Profile',
          'profile',
          'user-global · empty (use Catalog → Add to profile)',
          false,
          profileTooltip()
        )
      );
    }

    return headers;
  }
}
