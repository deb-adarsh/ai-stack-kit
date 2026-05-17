import * as vscode from 'vscode';
import * as path from 'node:path';
import {
  SKILL_BROWSER_URL,
  VIEW_CATALOG,
  VIEW_CONTAINER,
  VIEW_MODULES,
  VIEW_OUTPUTS,
} from './constants.js';
import { ModulesTreeProvider, ModuleTreeItem } from './views/modulesTreeProvider.js';
import { OutputsTreeProvider } from './views/outputsTreeProvider.js';
import { CatalogWebviewProvider } from './views/catalogWebviewProvider.js';
import {
  getAistackWorkspace,
  requireWorkspace,
  resetWorkspaceCache,
} from './services/workspaceService.js';
import {
  applyGithubTokenFromSettings,
  getExtensionConfig,
  type ClientType,
} from './services/configService.js';

let outputChannel: vscode.OutputChannel;
let modulesTree: ModulesTreeProvider;
let outputsTree: OutputsTreeProvider;
let statusSync: vscode.StatusBarItem;
let statusClient: vscode.StatusBarItem;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Mirrors {@link ModuleSearchHit} from the core package (avoid ESM type imports in the CJS extension host). */
interface CatalogSearchHit {
  name: string;
  version: string;
  description: string;
  source: string;
  moduleType?: string;
}

interface SearchPickItem extends vscode.QuickPickItem {
  hit: CatalogSearchHit;
}

export function activate(context: vscode.ExtensionContext): void {
  try {
    activateExtension(context);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    void vscode.window.showErrorMessage(`AI Stack Kit failed to activate: ${msg}`);
    throw e;
  }
}

function activateExtension(context: vscode.ExtensionContext): void {
  process.env.AISTACK_TEMPLATES_CLIENTS = path.join(context.extensionPath, 'templates', 'clients');
  process.env.AISTACK_SOURCES_CONFIG_TEMPLATE = path.join(
    context.extensionPath,
    'templates',
    'sources.config.yaml'
  );

  outputChannel = vscode.window.createOutputChannel('AI Stack Kit');
  modulesTree = new ModulesTreeProvider();
  outputsTree = new OutputsTreeProvider();

  context.subscriptions.push(
    outputChannel,
    vscode.window.registerTreeDataProvider(VIEW_MODULES, modulesTree),
    vscode.window.registerTreeDataProvider(VIEW_OUTPUTS, outputsTree),
    vscode.window.registerWebviewViewProvider(
      VIEW_CATALOG,
      new CatalogWebviewProvider(context.extensionUri)
    )
  );

  statusSync = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusSync.command = 'aistack.sync';
  statusSync.text = '$(sync) AI Stack';
  statusSync.tooltip = 'Sync skills to IDE outputs';
  statusSync.show();
  context.subscriptions.push(statusSync);

  statusClient = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusClient.command = 'aistack.doctor';
  statusClient.tooltip = 'Run doctor';
  statusClient.show();
  context.subscriptions.push(statusClient);

  const register = (id: string, fn: (...args: unknown[]) => Promise<void> | void) =>
    context.subscriptions.push(vscode.commands.registerCommand(id, fn));

  register('aistack.init', () => runInit());
  register('aistack.sync', () => runSync());
  register('aistack.doctor', () => runDoctor());
  register('aistack.search', () => runSearch());
  register('aistack.add', () => runAdd());
  register('aistack.switchClient', () => runSwitchClient());
  register('aistack.openCatalog', () => focusCatalogPanel());
  register('aistack.openSkillBrowser', () => openSkillBrowserWeb());
  register('aistack.refreshCatalog', () => runRefreshCatalogList());
  register('aistack.openSpec', () => openSpec());
  register('aistack.modules.refresh', () => refreshAll());
  register('aistack.removeModule', (item?: unknown) =>
    runRemoveModule(asModuleTreeItem(item)?.moduleName)
  );
  register('aistack.toggleModule', (item?: unknown) => {
    const mod = asModuleTreeItem(item);
    return runToggleModule(mod?.moduleName, mod?.enabled);
  });
  register('aistack.reportIssue', () => openReportIssue(context));

  const specWatcher = vscode.workspace.createFileSystemWatcher('**/spec.yaml');
  specWatcher.onDidChange(() => void onSpecChanged());
  specWatcher.onDidCreate(() => void onSpecChanged());
  context.subscriptions.push(specWatcher);

  void updateStatusBar();

  vscode.workspace.onDidChangeWorkspaceFolders(() => {
    resetWorkspaceCache();
    refreshAll();
  });
}

export function deactivate(): void {
  /* noop */
}

function refreshAll(): void {
  modulesTree.refresh();
  outputsTree.refresh();
  void updateStatusBar();
}

async function onSpecChanged(): Promise<void> {
  refreshAll();
  const cfg = getExtensionConfig();
  if (!cfg.autoSyncOnSave) return;
  const ws = getAistackWorkspace();
  if (!ws?.hasSpec()) return;
  await runSync(true);
}

async function updateStatusBar(): Promise<void> {
  const ws = getAistackWorkspace();
  if (!ws?.hasSpec()) {
    statusClient.text = '$(info) no spec';
    return;
  }
  try {
    const spec = await ws.readSpec();
    const modules = await ws.listSpecModules();
    statusClient.text = `$(hubot) ${spec.client.type} · ${modules.length} modules`;
  } catch {
    statusClient.text = '$(warning) spec invalid';
  }
}

async function focusCatalogPanel(): Promise<void> {
  try {
    await vscode.commands.executeCommand(`workbench.view.extension.${VIEW_CONTAINER}`);
    await vscode.commands.executeCommand(`${VIEW_CATALOG}.focus`);
  } catch (e) {
    log('error', e instanceof Error ? e.message : String(e));
    void vscode.window.showErrorMessage('Could not open the Catalog panel.');
  }
}

function openSkillBrowserWeb(): void {
  void vscode.env.openExternal(vscode.Uri.parse(SKILL_BROWSER_URL));
}

function asModuleTreeItem(item: unknown): ModuleTreeItem | undefined {
  return item instanceof ModuleTreeItem ? item : undefined;
}

function openReportIssue(context: vscode.ExtensionContext): void {
  const bugs = context.extension.packageJSON.bugs as { url?: string } | undefined;
  const base = bugs?.url ?? 'https://github.com/deb-adarsh/ai-stack-kit/issues';
  const url = base.endsWith('/issues') ? `${base}/new` : base;
  void vscode.env.openExternal(vscode.Uri.parse(url));
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const rest = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  outputChannel.appendLine(`[${level}] ${message}${rest}`);
}

async function runInit(): Promise<void> {
  try {
    const ws = requireWorkspace();
    const cfg = getExtensionConfig();
    if (ws.hasSpec()) {
      const pick = await vscode.window.showWarningMessage(
        'spec.yaml already exists. Re-initialize?',
        'Cancel',
        'Continue'
      );
      if (pick !== 'Continue') return;
    }
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Initializing AI Stack Kit' },
      async () => {
        await ws.init({
          clientType: cfg.clientType,
          installScope: cfg.installScope,
          skills: [],
        });
      }
    );
    void vscode.window.showInformationMessage('AI Stack Kit initialized (spec.yaml + sources.config.yaml)');
    refreshAll();
  } catch (e) {
    const msg = formatError(e);
    log('error', msg);
    void vscode.window.showErrorMessage(msg);
    outputChannel.show(true);
  }
}

function formatError(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'VALIDATION_ERROR') {
    const errors = (e as { errors?: { path: string; message: string }[] }).errors;
    if (errors?.length) {
      return `Spec validation failed:\n${errors.map((x) => `  • ${x.path}: ${x.message}`).join('\n')}`;
    }
  }
  return e instanceof Error ? e.message : String(e);
}

async function runSync(silent = false): Promise<void> {
  try {
    applyGithubTokenFromSettings();
    const ws = requireWorkspace();
    if (!ws.hasSpec()) {
      void vscode.window.showWarningMessage('Run Initialize Workspace first.');
      return;
    }
    const cfg = getExtensionConfig();
    let result: Awaited<ReturnType<typeof ws.syncWithLogger>> | undefined;
    await vscode.window.withProgress(
      {
        location: silent ? vscode.ProgressLocation.Window : vscode.ProgressLocation.Notification,
        title: cfg.dryRun ? 'Sync (dry run)' : 'Syncing AI Stack Kit',
        cancellable: false,
      },
      async () => {
        result = await ws.syncWithLogger(
          { dryRun: cfg.dryRun, verbose: false },
          (level: LogLevel, message: string, meta?: Record<string, unknown>) =>
            log(level, message, meta)
        );
        log(
          result.success ? 'info' : 'error',
          `Sync ${result.success ? 'complete' : 'failed'} — resolved: ${result.skillsResolved}, written: ${result.adapterReport?.written.length ?? 0}`
        );
        if (!result.success) {
          for (const err of result.errors) {
            log('error', `${err.skill ?? err.phase}: ${err.message}`);
          }
        }
      }
    );
    if (!silent) {
      if (result && !result.success) {
        const first = result.errors[0];
        void vscode.window.showErrorMessage(
          first
            ? `Sync failed: ${first.message}`
            : 'Sync failed — see AI Stack Kit output for details'
        );
      } else {
        void vscode.window.showInformationMessage(
          cfg.dryRun ? 'Dry run complete (see output)' : 'Sync complete'
        );
      }
    }
    refreshAll();
    outputChannel.show(true);
  } catch (e) {
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}

async function runDoctor(): Promise<void> {
  try {
    applyGithubTokenFromSettings();
    const ws = requireWorkspace();
    const { checks, ok } = await ws.doctor();
    outputChannel.clear();
    outputChannel.appendLine('AI Stack Kit doctor\n');
    for (const c of checks) {
      const mark = !c.ok ? '✗' : c.warn ? '!' : '✓';
      outputChannel.appendLine(`  ${mark}  ${c.message}`);
      if (c.hint) outputChannel.appendLine(`      ${c.hint}`);
    }
    outputChannel.show(true);
    if (ok) {
      void vscode.window.showInformationMessage('Doctor: all checks passed');
    } else {
      void vscode.window.showWarningMessage('Doctor: see Output panel for issues');
    }
  } catch (e) {
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}

async function runSearch(): Promise<void> {
  try {
    applyGithubTokenFromSettings();
    const ws = requireWorkspace();
    const q = await vscode.window.showInputBox({ prompt: 'Search catalog', placeHolder: 'react' });
    if (!q) return;
    const hits = await ws.search(q, { limit: 30 });
    if (!hits.length) {
      void vscode.window.showInformationMessage('No modules found');
      return;
    }
    const picked = await vscode.window.showQuickPick<SearchPickItem>(
      hits.map((h: CatalogSearchHit) => ({
        label: h.name,
        description: `${h.moduleType ?? 'skill'} · ${h.version}`,
        detail: h.description,
        hit: h,
      })),
      { placeHolder: 'Select a module' }
    );
    if (!picked) return;
    await ws.addModule({
      name: picked.hit.name,
      version: 'latest',
      source: picked.hit.source,
      moduleType: picked.hit.moduleType,
    });
    void vscode.window.showInformationMessage(`Added ${picked.hit.name}`);
    refreshAll();
  } catch (e) {
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}

async function runAdd(): Promise<void> {
  await runSearch();
}

async function runSwitchClient(): Promise<void> {
  try {
    const ws = requireWorkspace();
    const pick = await vscode.window.showQuickPick(
      [
        { label: 'Cursor', value: 'cursor' as ClientType },
        { label: 'GitHub Copilot (VS Code)', value: 'copilot' as ClientType },
        { label: 'Claude', value: 'claude' as ClientType },
      ],
      { placeHolder: 'Select client.type for spec.yaml' }
    );
    if (!pick) return;
    const scope = await vscode.window.showQuickPick(
      [
        { label: 'Project (repo-local)', value: 'project' as const },
        { label: 'User (global home dirs)', value: 'user' as const },
      ],
      { placeHolder: 'Install scope' }
    );
    if (!scope) return;
    await ws.setClientType(pick.value, scope.value);
    void vscode.window.showInformationMessage(`client.type set to ${pick.value}`);
    refreshAll();
  } catch (e) {
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}

async function runRefreshCatalogList(): Promise<void> {
  try {
    applyGithubTokenFromSettings();
    const ws = requireWorkspace();
    const result = await ws.catalogRefresh({ write: false });
    void vscode.window.showInformationMessage(
      `${result.candidateNames.length} catalog entries not yet in spec.yaml`
    );
  } catch (e) {
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}

async function openSpec(): Promise<void> {
  const ws = getAistackWorkspace();
  if (!ws?.hasSpec()) {
    void vscode.window.showWarningMessage('No spec.yaml');
    return;
  }
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(ws.specPath));
  await vscode.window.showTextDocument(doc);
}

async function runRemoveModule(name?: string): Promise<void> {
  if (!name) return;
  try {
    const ws = requireWorkspace();
    await ws.removeModule(name);
    refreshAll();
  } catch (e) {
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}

async function runToggleModule(name?: string, currentlyEnabled?: boolean): Promise<void> {
  if (!name) return;
  try {
    const ws = requireWorkspace();
    await ws.setModuleEnabled(name, currentlyEnabled === undefined ? true : !currentlyEnabled);
    refreshAll();
  } catch (e) {
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}
