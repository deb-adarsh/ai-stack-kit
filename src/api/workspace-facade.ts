/**
 * Multi-spec workspace helpers (project + profile).
 */

import type { ClientType } from '../types/spec.js';
import { hasProfileSpec, userAistackRoot } from '../paths/aistack-paths.js';
import { ensureProfileSpec } from './profile-spec.js';
import { AistackWorkspace } from './workspace-api.js';
import type {
  AddModuleOptions,
  DualSyncResult,
  OutputPathEntry,
  SearchOptions,
  SpecModuleRow,
  SpecTarget,
  SyncOptions,
} from './types.js';

export function getProfileWorkspace(): AistackWorkspace {
  return new AistackWorkspace(userAistackRoot());
}

export function getProjectWorkspace(projectRoot: string): AistackWorkspace {
  return new AistackWorkspace(projectRoot);
}

export function resolveCatalogCwd(projectRoot?: string): string {
  if (projectRoot) {
    const ws = getProjectWorkspace(projectRoot);
    if (ws.hasSpec()) return projectRoot;
  }
  if (hasProfileSpec()) return userAistackRoot();
  return projectRoot ?? userAistackRoot();
}

export async function resolveWorkspaceForTarget(
  target: SpecTarget,
  projectRoot?: string
): Promise<AistackWorkspace> {
  if (target === 'profile') {
    let projectSpec;
    if (projectRoot) {
      const projectWs = getProjectWorkspace(projectRoot);
      if (projectWs.hasSpec()) {
        projectSpec = await projectWs.readSpec();
      }
    }
    await ensureProfileSpec({
      clientType: projectSpec?.client?.type as ClientType | undefined,
      projectSpec,
    });
    return getProfileWorkspace();
  }
  if (!projectRoot) {
    throw Object.assign(new Error('Open a folder workspace first.'), { code: 'NO_WORKSPACE' });
  }
  const ws = getProjectWorkspace(projectRoot);
  if (!ws.hasSpec()) {
    throw Object.assign(new Error('No spec.yaml — run Initialize Workspace.'), { code: 'SPEC_NOT_FOUND' });
  }
  return ws;
}

export async function addModuleWithTarget(
  opts: AddModuleOptions,
  projectRoot?: string
): Promise<{ workspace: AistackWorkspace; target: SpecTarget }> {
  const target = opts.specTarget ?? 'project';
  const catalogCwd = resolveCatalogCwd(projectRoot);
  const ws = await resolveWorkspaceForTarget(target, projectRoot);

  let source = opts.source;
  let sourceConfig = opts.sourceConfig;
  if (!source || !sourceConfig) {
    const info = (await ws.getModuleInfo(opts.name)) as {
      source: string;
      sourceConfig?: Record<string, unknown>;
    };
    if (!info?.source) {
      const fallback = new AistackWorkspace(catalogCwd);
      const info2 = (await fallback.getModuleInfo(opts.name)) as {
        source: string;
        sourceConfig?: Record<string, unknown>;
      };
      source = source ?? info2.source;
      sourceConfig = sourceConfig ?? info2.sourceConfig;
    } else {
      source = source ?? info.source;
      sourceConfig = sourceConfig ?? info.sourceConfig;
    }
  }

  await ws.addModule({
    name: opts.name,
    version: opts.version,
    source,
    sourceConfig,
    config: opts.config,
    moduleType: opts.moduleType,
    clientInstallScope: target === 'profile' ? undefined : opts.clientInstallScope,
  });
  return { workspace: ws, target };
}

export async function listAllSpecModules(projectRoot?: string): Promise<SpecModuleRow[]> {
  const rows: SpecModuleRow[] = [];

  if (projectRoot) {
    const projectWs = getProjectWorkspace(projectRoot);
    if (projectWs.hasSpec()) {
      const projectRows = await projectWs.listSpecModules();
      for (const r of projectRows) {
        rows.push({ ...r, specTarget: 'project' });
      }
    }
  }

  if (hasProfileSpec()) {
    const profileWs = getProfileWorkspace();
    const profileRows = await profileWs.listSpecModules();
    for (const r of profileRows) {
      rows.push({ ...r, specTarget: 'profile' });
    }
  }

  return rows;
}

export async function listAllOutputPaths(projectRoot?: string): Promise<OutputPathEntry[]> {
  const out: OutputPathEntry[] = [];

  if (projectRoot) {
    const projectWs = getProjectWorkspace(projectRoot);
    if (projectWs.hasSpec()) {
      const paths = await projectWs.listOutputPaths();
      for (const p of paths) {
        out.push({ ...p, label: `Project: ${p.label}` });
      }
    }
  }

  if (hasProfileSpec()) {
    const profileWs = getProfileWorkspace();
    const paths = await profileWs.listOutputPaths();
    for (const p of paths) {
      out.push({ ...p, label: `Profile: ${p.label}` });
    }
  }

  return out;
}

export async function syncAllScopes(
  projectRoot: string | undefined,
  options: SyncOptions = {}
): Promise<DualSyncResult> {
  const result: DualSyncResult = {};

  if (projectRoot) {
    const projectWs = getProjectWorkspace(projectRoot);
    if (projectWs.hasSpec()) {
      result.project = await projectWs.sync(options);
    }
  }

  if (hasProfileSpec()) {
    const profileWs = getProfileWorkspace();
    result.profile = await profileWs.sync(options);
  }

  return result;
}

export async function searchCatalog(query: string, opts: SearchOptions = {}, projectRoot?: string) {
  const cwd = resolveCatalogCwd(projectRoot);
  return new AistackWorkspace(cwd).search(query, opts);
}
