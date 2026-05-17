/**
 * Compare configured catalog sources with spec.yaml and optionally append new modules
 * using YAML Document merge (preserves comments / structure outside appended nodes).
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { runCatalogRefreshCore } from '../api/catalog-refresh-core.js';
import { CLI_COMMAND } from '../branding.js';

export interface CatalogRefreshCliOptions {
  cwd: string;
  write: boolean;
  yes: boolean;
  refreshSources: boolean;
  max: number;
  json: boolean;
}

export async function runCatalogRefresh(opts: CatalogRefreshCliOptions): Promise<{
  candidateNames: string[];
  added: string[];
  skippedErrors: { name: string; message: string }[];
}> {
  const spinner = ora('Loading catalog…').start();

  try {
    if (!opts.write) {
      const result = await runCatalogRefreshCore({
        cwd: opts.cwd,
        write: false,
        refreshSources: opts.refreshSources,
        max: opts.max,
      });
      spinner.succeed(`Catalog: ${result.candidateNames.length} new module(s) not in spec.yaml`);

      if (opts.json) {
        console.log(
          JSON.stringify({ candidates: result.candidateNames.length, names: result.candidateNames }, null, 2)
        );
      } else {
        const preview = result.candidateNames.slice(0, 40);
        console.log(chalk.gray(`\nNew catalog entries (not in spec): ${result.candidateNames.length}`));
        if (preview.length) {
          console.log(chalk.gray(preview.map((n) => `  • ${n}`).join('\n')));
          if (result.candidateNames.length > preview.length) {
            console.log(chalk.gray(`  … and ${result.candidateNames.length - preview.length} more`));
          }
        }
        console.log(
          chalk.cyan(
            `\nRun ${chalk.bold(`${CLI_COMMAND} catalog refresh --write`)} to append (interactive), or add ${chalk.bold('-y')} for non-interactive (see ${chalk.bold('--max')}).`
          )
        );
      }
      return result;
    }

    spinner.stop();

    const listed = await runCatalogRefreshCore({
      cwd: opts.cwd,
      write: false,
      refreshSources: opts.refreshSources,
      max: opts.max,
    });

    let namesToAppend: string[];
    if (opts.yes) {
      namesToAppend = listed.candidateNames.slice(0, opts.max);
      if (namesToAppend.length < listed.candidateNames.length) {
        console.log(
          chalk.yellow(`--yes: appending first ${namesToAppend.length} of ${listed.candidateNames.length} (see --max)`)
        );
      }
    } else {
      if (!listed.candidateNames.length) {
        console.log(chalk.gray('Nothing new to add.'));
        return listed;
      }
      const answer = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'names',
          message: 'Select catalog modules to append under modules: (disabled by default)',
          choices: listed.candidateNames.map((n) => ({ name: n, value: n })),
          pageSize: 15,
        },
      ]);
      namesToAppend = answer.names as string[];
      if (!namesToAppend?.length) {
        console.log(chalk.gray('No modules selected; spec unchanged.'));
        return { ...listed, added: [], skippedErrors: [] };
      }
    }

    const writeSpin = ora(`Appending ${namesToAppend.length} module(s)…`).start();
    const result = await runCatalogRefreshCore({
      cwd: opts.cwd,
      write: true,
      namesToAppend,
      refreshSources: opts.refreshSources,
      max: opts.max,
    });
    writeSpin.succeed('Catalog refresh complete');

    if (!opts.json) {
      console.log(chalk.green(`\n✓ Appended ${result.added.length} module(s) under ${chalk.bold('modules:')}`));
      if (result.skippedErrors.length) {
        console.log(chalk.yellow(`  Skipped ${result.skippedErrors.length} resolve error(s):`));
        result.skippedErrors.forEach((s) => console.log(chalk.yellow(`    • ${s.name}: ${s.message}`)));
      }
      console.log(chalk.gray('\nNew rows use enabled: false — enable entries you want, then run sync.'));
    } else {
      console.log(JSON.stringify({ added: result.added, skippedErrors: result.skippedErrors }, null, 2));
    }

    return { candidateNames: listed.candidateNames, added: result.added, skippedErrors: result.skippedErrors };
  } catch (e) {
    spinner.fail('Catalog refresh failed');
    throw e;
  }
}
