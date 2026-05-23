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
  addModuleWithTarget,
  getAistackWorkspace,
  getProjectRoot,
  hasProfileSpec,
  listAllSpecModules,
  requireWorkspace,
  resetWorkspaceCache,
  searchCatalog,
  type SpecTarget,
} from './services/workspaceService.js';
import { getProfileWorkspace, userSpecPath, type ApplyPipelineResult } from 'ai-stack-kit-core';
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
  const catalogProvider = new CatalogWebviewProvider(context.extensionUri);

  context.subscriptions.push(
    outputChannel,
    vscode.window.registerTreeDataProvider(VIEW_MODULES, modulesTree),
    vscode.window.registerTreeDataProvider(VIEW_OUTPUTS, outputsTree),
    vscode.window.registerWebviewViewProvider(VIEW_CATALOG, catalogProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
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
  register('aistack.showSidebar', () => showAistackSidebar());
  register('aistack.openCatalog', () => focusCatalogPanel(catalogProvider));
  register('aistack.openSkillBrowser', () => openSkillBrowserWeb());
  register('aistack.refreshCatalog', () => runRefreshCatalogList());
  register('aistack.openSpec', () => openSpec());
  register('aistack.modules.refresh', () => refreshAll());
  register('aistack.removeModule', (item?: unknown) => {
    const mod = asModuleTreeItem(item);
    return runRemoveModule(mod?.moduleName, mod?.specTarget);
  });
  register('aistack.toggleModule', (item?: unknown) => {
    const mod = asModuleTreeItem(item);
    return runToggleModule(mod?.moduleName, mod?.enabled, mod?.specTarget);
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
  if (!ws?.hasSpec() && !hasProfileSpec()) return;
  await runSync(true);
}

async function updateStatusBar(): Promise<void> {
  const projectRoot = getProjectRoot();
  const projectWs = getAistackWorkspace();
  const hasProject = Boolean(projectWs?.hasSpec());
  const hasProfile = hasProfileSpec();

  if (!hasProject && !hasProfile) {
    statusClient.text = '$(info) no spec';
    return;
  }

  try {
    const modules = await listAllSpecModules(projectRoot);
    let clientType = 'copilot';
    if (hasProject && projectWs) {
      const spec = await projectWs.readSpec();
      clientType = spec.client.type;
    } else if (hasProfile) {
      const spec = await getProfileWorkspace().readSpec();
      clientType = spec.client.type;
    }
    const parts: string[] = [];
    if (hasProject) parts.push('project');
    if (hasProfile) parts.push('profile');
    statusClient.text = `$(hubot) ${clientType} · ${modules.length} (${parts.join('+')})`;
  } catch {
    statusClient.text = '$(warning) spec invalid';
  }
}

async function showAistackSidebar(): Promise<void> {
  try {
    await vscode.commands.executeCommand(`workbench.view.extension.${VIEW_CONTAINER}`);
  } catch (e) {
    log('error', e instanceof Error ? e.message : String(e));
    void vscode.window.showWarningMessage(
      'Could not open the AI Stack Kit sidebar. Run "View: Reset View Locations", reload the window, then click the AI Stack Kit icon on the Activity Bar (far left).'
    );
  }
}

async function focusCatalogPanel(catalog: CatalogWebviewProvider): Promise<void> {
  await showAistackSidebar();

  // View may not be resolved until the container is visible; retry briefly.
  for (let attempt = 0; attempt < 5; attempt++) {
    if (catalog.reveal()) {
      return;
    }
    try {
      await vscode.commands.executeCommand(`${VIEW_CATALOG}.focus`);
      return;
    } catch {
      /* focus command unavailable until view container exists */
    }
    try {
      await vscode.commands.executeCommand('workbench.action.openView', VIEW_CATALOG);
      if (catalog.reveal()) {
        return;
      }
      return;
    } catch {
      /* openView not available on older hosts */
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  log('warn', 'Catalog panel could not be focused; view container may be missing from Activity Bar.');
  void vscode.window.showWarningMessage(
    'Open the **Catalog** section in the sidebar. If AI Stack Kit views appear under Explorer, run **View: Reset View Locations** and reload the window, or use **AI Stack Kit: Show Sidebar**.'
  );
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

/**
 * Guards against overlapping Sync runs. When two sources fire close together
 * (status bar click + autoSyncOnSave from the file watcher), the second call
 * waits for the first to finish instead of racing on disk writes. Returning
 * the same Promise also collapses duplicate clicks into a single run.
 */
let syncInFlight: Promise<void> | null = null;

async function runSync(silent = false): Promise<void> {
  if (syncInFlight) {
    log('debug', 'Sync already in progress — joining existing run');
    return syncInFlight;
  }
  syncInFlight = doRunSync(silent).finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

async function doRunSync(silent: boolean): Promise<void> {
  try {
    applyGithubTokenFromSettings();
    const projectRoot = getProjectRoot();
    const projectWs = getAistackWorkspace();
    const hasProject = Boolean(projectWs?.hasSpec());
    const hasProfile = hasProfileSpec();

    if (!hasProject && !hasProfile) {
      void vscode.window.showWarningMessage(
        'No spec found — run Initialize Workspace or add modules to your profile.'
      );
      return;
    }

    const cfg = getExtensionConfig();
    const syncOpts = { dryRun: cfg.dryRun, verbose: false };
    let projectResult: ApplyPipelineResult | undefined;
    let profileResult: ApplyPipelineResult | undefined;

    await vscode.window.withProgress(
      {
        location: silent ? vscode.ProgressLocation.Window : vscode.ProgressLocation.Notification,
        title: cfg.dryRun ? 'Sync (dry run)' : 'Syncing AI Stack Kit',
        cancellable: false,
      },
      async () => {
        if (hasProject && projectWs) {
          log('info', 'Syncing project spec…');
          projectResult = await projectWs.syncWithLogger(syncOpts, log);
          logScopeResult('project', projectResult);
        }
        if (hasProfile) {
          log('info', 'Syncing profile spec…');
          const profileWs = getProfileWorkspace();
          profileResult = await profileWs.syncWithLogger(syncOpts, log);
          logScopeResult('profile', profileResult);
        }
      }
    );

    const anyFailed =
      projectResult?.success === false || profileResult?.success === false;
    const conflicts = [
      ...(projectResult?.adapterReport?.conflicts ?? []),
      ...(profileResult?.adapterReport?.conflicts ?? []),
    ];
    if (!silent) {
      if (anyFailed) {
        const first =
          projectResult?.errors[0] ?? profileResult?.errors[0];
        void vscode.window.showErrorMessage(
          first
            ? `Sync failed: ${first.message}`
            : 'Sync failed — see AI Stack Kit output for details'
        );
      } else if (conflicts.length) {
        void vscode.window.showWarningMessage(
          `Sync complete with ${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'} — see AI Stack Kit output.`
        );
      } else {
        void vscode.window.showInformationMessage(
          cfg.dryRun ? 'Dry run complete (see output)' : 'Sync complete'
        );
      }
    }
    refreshAll();
    if (!silent || anyFailed || conflicts.length) outputChannel.show(true);
  } catch (e) {
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}

function logScopeResult(
  scope: string,
  result: {
    success: boolean;
    skillsResolved: number;
    errors: { skill?: string; phase?: string; message: string }[];
    adapterReport?: {
      written: string[];
      merged?: string[];
      skipped?: string[];
      conflicts?: { path: string; message: string }[];
    };
  }
): void {
  log(
    result.success ? 'info' : 'error',
    `[${scope}] Sync ${result.success ? 'complete' : 'failed'} — resolved: ${result.skillsResolved}, written: ${result.adapterReport?.written.length ?? 0}, merged: ${result.adapterReport?.merged?.length ?? 0}, skipped: ${result.adapterReport?.skipped?.length ?? 0}`
  );
  if (!result.success) {
    for (const err of result.errors) {
      log('error', `[${scope}] ${err.skill ?? err.phase}: ${err.message}`);
    }
  }
  for (const c of result.adapterReport?.conflicts ?? []) {
    log('warn', `[${scope}] conflict: ${c.path} — ${c.message}`);
  }
}

async function runDoctor(): Promise<void> {
  try {
    applyGithubTokenFromSettings();
    const projectWs = getAistackWorkspace();
    const profileWs = hasProfileSpec() ? getProfileWorkspace() : undefined;
    if (!projectWs?.hasSpec() && !profileWs) {
      void vscode.window.showWarningMessage('No project or profile spec found.');
      return;
    }

    outputChannel.clear();
    outputChannel.appendLine('AI Stack Kit doctor\n');
    let allOk = true;

    if (projectWs?.hasSpec()) {
      outputChannel.appendLine('Project spec\n');
      const { checks, ok } = await projectWs.doctor();
      allOk = allOk && ok;
      appendDoctorChecks(checks);
    }

    if (profileWs) {
      outputChannel.appendLine('\nProfile spec (~/.aistack)\n');
      const { checks, ok } = await profileWs.doctor();
      allOk = allOk && ok;
      appendDoctorChecks(checks);
    }

    outputChannel.show(true);
    if (allOk) {
      void vscode.window.showInformationMessage('Doctor: all checks passed');
    } else {
      void vscode.window.showWarningMessage('Doctor: see Output panel for issues');
    }
  } catch (e) {
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}

function appendDoctorChecks(
  checks: { ok: boolean; warn?: boolean; message: string; hint?: string }[]
): void {
  for (const c of checks) {
    const mark = !c.ok ? '✗' : c.warn ? '!' : '✓';
    outputChannel.appendLine(`  ${mark}  ${c.message}`);
    if (c.hint) outputChannel.appendLine(`      ${c.hint}`);
  }
}

async function pickAddTarget(): Promise<SpecTarget | undefined> {
  const projectRoot = getProjectRoot();
  const projectWs = getAistackWorkspace();
  const canProject = Boolean(projectRoot && projectWs?.hasSpec());
  const canProfile = true;

  if (canProject && canProfile) {
    const pick = await vscode.window.showQuickPick(
      [
        { label: 'Add to project', description: 'repo spec.yaml', value: 'project' as const },
        { label: 'Add to profile', description: '~/.aistack/spec.yaml', value: 'profile' as const },
      ],
      { placeHolder: 'Where should this module be recorded?' }
    );
    return pick?.value;
  }
  if (canProject) return 'project';
  if (canProfile) return 'profile';
  void vscode.window.showWarningMessage('Open a folder and initialize, or use Catalog → Add to profile.');
  return undefined;
}

async function runSearch(): Promise<void> {
  try {
    applyGithubTokenFromSettings();
    const q = await vscode.window.showInputBox({ prompt: 'Search catalog', placeHolder: 'react' });
    if (!q) return;
    const hits = await searchCatalog(q, { limit: 30 }, getProjectRoot());
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

    const target = await pickAddTarget();
    if (!target) return;

    await addModuleWithTarget(
      {
        name: picked.hit.name,
        version: 'latest',
        source: picked.hit.source,
        moduleType: picked.hit.moduleType,
        specTarget: target,
      },
      getProjectRoot()
    );
    void vscode.window.showInformationMessage(
      `Added ${picked.hit.name} to ${target} spec`
    );
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
  const projectWs = getAistackWorkspace();
  const hasProject = Boolean(projectWs?.hasSpec());
  const hasProfile = hasProfileSpec();

  if (!hasProject && !hasProfile) {
    void vscode.window.showWarningMessage('No project or profile spec.yaml');
    return;
  }

  let specPath: string;
  if (hasProject && hasProfile) {
    const pick = await vscode.window.showQuickPick(
      [
        { label: 'Project spec', description: projectWs!.specPath, value: projectWs!.specPath },
        { label: 'Profile spec', description: userSpecPath(), value: userSpecPath() },
      ],
      { placeHolder: 'Open spec.yaml' }
    );
    if (!pick) return;
    specPath = pick.value;
  } else if (hasProject) {
    specPath = projectWs!.specPath;
  } else {
    specPath = userSpecPath();
  }

  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(specPath));
  await vscode.window.showTextDocument(doc);
}

function workspaceForTarget(target: SpecTarget = 'project') {
  if (target === 'profile') return getProfileWorkspace();
  return requireWorkspace();
}

async function runRemoveModule(name?: string, target: SpecTarget = 'project'): Promise<void> {
  if (!name) return;
  try {
    const ws = workspaceForTarget(target);
    await ws.removeModule(name);
    refreshAll();
  } catch (e) {
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}

async function runToggleModule(
  name?: string,
  currentlyEnabled?: boolean,
  target: SpecTarget = 'project'
): Promise<void> {
  if (!name) return;
  try {
    const ws = workspaceForTarget(target);
    await ws.setModuleEnabled(name, currentlyEnabled === undefined ? true : !currentlyEnabled);
    refreshAll();
  } catch (e) {
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}
