/**
 * Shared global CLI flags (-v, --offline, --dry-run) from the root Commander program.
 */

import type { Command } from 'commander';

export interface GlobalCliOptions {
  verbose: boolean;
  offline: boolean;
  dryRun: boolean;
}

/** Read root-level flags merged with the active subcommand (Commander v11). */
export function getGlobalCliOptions(cmd: Command): GlobalCliOptions {
  const o = cmd.optsWithGlobals() as Record<string, unknown>;
  return {
    verbose: Boolean(o.verbose),
    offline: Boolean(o.offline),
    dryRun: Boolean(o.dryRun),
  };
}

export function dryRunSuffix(dryRun: boolean): string {
  return dryRun ? ' (dry run — no files written)' : '';
}
