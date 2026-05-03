#!/usr/bin/env node
/**
 * CLI Command Structure and Design
 *
 * Main commands:
 * - aistack init              Initialize new project
 * - aistack skill|subagent|hook  search / add / info (type-specific; add supports --install-scope)
 * - aistack add|search|info   Legacy aliases (all types or --type)
 * - aistack catalog refresh    Diff catalogs vs spec; optional YAML-safe append under modules:
 * - aistack remove            Remove a module from spec.yaml
 * - aistack install / apply / sync
 * - aistack list              List modules in spec.yaml
 */

import { Command, Option } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import figures from 'figures';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLI_COMMAND, PRODUCT_NAME } from '../branding.js';
import {
  detectClient,
  createSpecFile,
  runApply,
  searchModules,
  searchSkills,
  searchSubagents,
  searchHooks,
  addModuleToSpec,
  removeModuleFromSpec,
  readSpec,
  validateSpecFile,
  getModuleVersions,
  getModuleInfo,
  parseModuleTypeCli,
  ensureDefaultSourcesConfig,
} from './commands.js';
import { runCatalogRefresh } from './catalog-refresh.js';
import { flattenSpecModules } from '../types/spec.js';
import { DEFAULT_MODULE_TYPE, type AIModuleType } from '../types/ai-module.js';
import { detectProjectSignals } from './project-detection.js';
import { buildSkillSuggestions } from './skill-suggestions.js';
import {
  printProjectDetectionSummary,
  promptMultiSelectSuggestibleSkills,
} from './interactive-skills.js';

/**
 * CLI Context - shared across commands
 */
export interface CLIContext {
  cwd: string;
  configPath: string;
  verbose: boolean;
  offline: boolean;
  dryRun: boolean;
}

function formatDownloads(count: number): string {
  if (!count) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function displayModuleInfo(info: any, roleLabel?: string) {
  const label = roleLabel ?? String(info.moduleType ?? 'module');
  console.log();
  console.log(chalk.cyan.bold(`${label}: ${info.name}`) + chalk.gray(` v${info.version}`));
  console.log(info.description);
  console.log();

  const data = [
    ['Type', info.moduleType ?? DEFAULT_MODULE_TYPE],
    ['Author', info.author || 'N/A'],
    ['License', info.license || 'N/A'],
    ['Repository', info.repository || 'N/A'],
    ['Tags', (info.tags ?? []).join(', ')],
    ['Clients', (info.supportedClients ?? []).join(', ')],
    ['Downloads', formatDownloads(info.stats?.downloads)],
  ];

  console.log(
    table(data, {
      border: {
        topBody: chalk.gray('─'),
        topJoin: chalk.gray('┬'),
        topLeft: chalk.gray('┌'),
        topRight: chalk.gray('┐'),
        bottomBody: chalk.gray('─'),
        bottomJoin: chalk.gray('┴'),
        bottomLeft: chalk.gray('└'),
        bottomRight: chalk.gray('┘'),
        bodyLeft: chalk.gray('│'),
        bodyRight: chalk.gray('│'),
        bodyJoin: chalk.gray('│'),
        joinBody: chalk.gray('─'),
        joinLeft: chalk.gray('├'),
        joinRight: chalk.gray('┤'),
        joinJoin: chalk.gray('┼'),
      },
    })
  );

  if (info.dependencies && Object.keys(info.dependencies).length > 0) {
    console.log(chalk.cyan('Dependencies:'));
    Object.entries(info.dependencies).forEach(([name, version]) => {
      console.log(`  ${figures.pointer} ${name}@${version}`);
    });
  }
}

function displaySkillInfo(info: any) {
  displayModuleInfo(info, 'Skill');
}

function displaySubagentInfo(info: any) {
  displayModuleInfo(info, 'Subagent');
}

function displayHookInfo(info: any) {
  displayModuleInfo(info, 'Hook');
}

function formatModuleSearchChoice(hit: any): string {
  const name = chalk.cyan(hit.name);
  const version = chalk.gray(`v${hit.version}`);
  const kind = chalk.magenta(`[${hit.moduleType ?? DEFAULT_MODULE_TYPE}]`);
  const desc = chalk.dim((hit.description ?? '').slice(0, 50));
  const tags = (hit.tags ?? []).slice(0, 3).map((t: string) => chalk.yellow(`#${t}`)).join(' ');
  const downloads = chalk.gray(`${figures.arrowDown} ${formatDownloads(hit.downloads)}`);

  return `${name} ${kind} ${version} - ${desc}\n  ${tags} ${downloads}`;
}

function displaySearchResults(results: any[]) {
  const data = [
    [
      chalk.bold('Name'),
      chalk.bold('Type'),
      chalk.bold('Version'),
      chalk.bold('Description'),
      chalk.bold('Downloads'),
    ],
    ...results.map((hit) => [
      chalk.cyan(hit.name),
      chalk.magenta(hit.moduleType ?? DEFAULT_MODULE_TYPE),
      chalk.gray(hit.version),
      (hit.description ?? '').slice(0, 36) + ((hit.description?.length ?? 0) > 36 ? '...' : ''),
      formatDownloads(hit.downloads),
    ]),
  ];

  console.log(table(data));
}

/**
 * Create CLI program
 */
export function createCLI(): Command {
  const program = new Command();

  program
    .name(CLI_COMMAND)
    .description(`${PRODUCT_NAME}: manage AI modules (skills, subagents, hooks) and IDE client configs`)
    .version('1.0.0')
    .option('-v, --verbose', 'Verbose output')
    .option('--offline', 'Offline mode')
    .option('--dry-run', 'Preview changes without applying');

  // Register all commands
  registerInitCommand(program);
  registerModuleKindCommandGroups(program);
  registerAddCommand(program);
  registerRemoveCommand(program);
  registerSearchCommand(program);
  registerInfoCommand(program);
  registerInstallCommand(program);
  registerApplyCommand(program);
  registerSyncCommand(program);
  registerListCommand(program);
  registerStatusCommand(program);
  registerUpdateCommand(program);
  registerValidateCommand(program);
  registerCleanCommand(program);
  registerCatalogCommands(program);

  return program;
}

function installScopeCliOption(): Option {
  return new Option(
    '--install-scope <scope>',
    'Set client.installScope in spec.yaml: project (repo-local .cursor/.github/.claude) or user (global home dirs). Omit to leave client.installScope unchanged (unset means project-level apply).'
  ).choices(['project', 'user']);
}

/**
 * COMMAND: aistack init
 *
 * Initialize a new project with interactive prompts
 */
function registerInitCommand(program: Command) {
  program
    .command('init')
    .description(`Initialize a new ${PRODUCT_NAME} project`)
    .option('-y, --yes', 'Skip prompts and use defaults')
    .option('-t, --template <name>', 'Use a template')
    .action(async (options) => {
      const spinner = ora('Initializing project...').start();

      try {
        // Step 1: Detect client
        spinner.text = 'Detecting IDE/client...';
        const detectedClient = await detectClient();
        spinner.succeed(`Detected client: ${chalk.cyan(detectedClient.name)}`);

        if (options.yes) {
          // Quick init with defaults
          await quickInit(detectedClient);
          return;
        }

        // Step 2: Interactive project setup
        const projectAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'projectName',
            message: 'Project name:',
            default: 'my-ide-setup',
          },
          {
            type: 'input',
            name: 'description',
            message: 'Description:',
            default: 'My IDE configuration',
          },
          {
            type: 'input',
            name: 'author',
            message: 'Author:',
          },
        ]);

        // Step 3: Confirm client (choices must cover detectClient() types we care about)
        const clientChoices = [
          { name: 'Cursor', value: 'cursor' },
          { name: 'GitHub Copilot (VS Code)', value: 'copilot' },
          { name: 'Claude', value: 'claude' },
          { name: 'VS Code', value: 'vscode' },
          { name: 'IntelliJ IDEA', value: 'intellij' },
          { name: 'Neovim', value: 'neovim' },
          { name: 'Other', value: 'other' },
        ] as const;
        const defaultClientType = clientChoices.some((c) => c.value === detectedClient.type)
          ? detectedClient.type
          : 'cursor';

        const clientAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'client',
            message: 'Select client/IDE:',
            default: defaultClientType,
            choices: [...clientChoices],
          },
        ]);

        // Step 4: Project-aware skill suggestions + multi-select
        spinner.start('Analyzing project...');
        const cwd = process.cwd();
        const signals = await detectProjectSignals(cwd);
        spinner.succeed('Project analyzed');
        printProjectDetectionSummary(signals);
        const catalog = buildSkillSuggestions(signals);
        const skillNames = await promptMultiSelectSuggestibleSkills(catalog, {
          message: 'Select skills to include in spec.yaml:',
        });

        // Step 5: Additional settings
        const settingsAnswers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'autoSync',
            message: 'Enable auto-sync?',
            default: false,
          },
          {
            type: 'confirm',
            name: 'verifyChecksums',
            message: 'Verify checksums?',
            default: true,
          },
        ]);

        // Step 6: Create spec.yaml
        spinner.start('Creating spec.yaml...');
        await createSpecFile({
          project: projectAnswers,
          client: clientAnswer.client,
          skills: skillNames,
          settings: settingsAnswers,
        });
        await ensureDefaultSourcesConfig(process.cwd());
        spinner.succeed('Created spec.yaml');

        // Step 7: Install skills
        const shouldInstall = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'install',
            message: 'Install skills now?',
            default: true,
          },
        ]);

        if (shouldInstall.install) {
          await runApply(process.cwd());
        }

        console.log(chalk.green('\n✓ Project initialized successfully!'));
        console.log(chalk.gray('\nNext steps:'));
        console.log(chalk.gray('  1. Review spec.yaml'));
        console.log(chalk.gray(`  2. Run: ${CLI_COMMAND} sync`));

      } catch (error) {
        spinner.fail('Initialization failed');
        handleError(error);
      }
    });
}

type AddCliOptions = {
  type?: string;
  source?: string;
  saveDev?: boolean;
  /** Passed through from `--install-scope`; updates spec client.installScope when set. */
  installScope?: 'project' | 'user';
};

async function executeAddModuleFlow(params: {
  nameArg?: string;
  options: AddCliOptions;
  lockedKind?: AIModuleType;
}): Promise<void> {
  const { nameArg, options, lockedKind } = params;

  let explicitType: AIModuleType | undefined;
  if (lockedKind !== undefined) {
    explicitType = lockedKind;
  } else if (options.type) {
    explicitType = parseModuleTypeCli(options.type);
  }

  const moduleTypesFilter =
    lockedKind !== undefined ? [lockedKind] : explicitType !== undefined ? [explicitType] : undefined;

  let selected: any;

  if (nameArg) {
    const spinner = ora(`Looking up ${nameArg}…`).start();
    let info: any;
    try {
      info = await getModuleInfo(nameArg);
      spinner.succeed();
    } catch {
      spinner.fail();
      console.log(chalk.yellow(`"${nameArg}" not found in catalog`));
      return;
    }

    if (lockedKind && info.moduleType && info.moduleType !== lockedKind) {
      console.log(
        chalk.yellow(
          `Note: catalog reports type "${info.moduleType}" for this entry (you ran ${chalk.bold(lockedKind)} add).`
        )
      );
    }

    if (lockedKind === 'subagent') displaySubagentInfo(info);
    else if (lockedKind === 'hook') displayHookInfo(info);
    else if (lockedKind === 'skill') displaySkillInfo(info);
    else displayModuleInfo(info);

    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'add',
        message: `Add ${nameArg} to spec.yaml?`,
        default: true,
      },
    ]);

    if (!confirm.add) return;
    selected = info;
  } else {
    console.log(chalk.cyan('Search the catalog:'));
    const searchAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: 'Search:',
        validate: (input) => input.length > 0 || 'Please enter a search term',
      },
    ]);

    const spinner = ora('Searching...').start();
    const results = await searchModules(searchAnswer.query, {
      cwd: process.cwd(),
      moduleTypes: moduleTypesFilter,
    });
    spinner.succeed(`Found ${results.length} result(s)`);

    if (results.length === 0) {
      console.log(chalk.yellow('No matching modules found'));
      return;
    }

    const selectAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'picked',
        message: 'Select a module:',
        pageSize: 10,
        choices: results.map((hit) => ({
          name: formatModuleSearchChoice(hit),
          value: hit,
        })),
      },
    ]);

    selected = selectAnswer.picked;
  }

  const verSpinner = ora('Fetching versions...').start();
  const versions = await getModuleVersions(selected.name);
  verSpinner.succeed();

  const versionAnswer = await inquirer.prompt([
    {
      type: 'list',
      name: 'version',
      message: 'Select version:',
      default: 'latest',
      choices: [
        { name: `latest (${versions[0]})`, value: 'latest' },
        new inquirer.Separator(),
        ...versions.slice(0, 10).map((v) => ({ name: v, value: v })),
        ...(versions.length > 10 ? [{ name: 'Other...', value: 'custom' }] : []),
      ],
    },
  ]);

  let config = {};
  if (selected.configSchema) {
    const label = lockedKind ?? 'module';
    const configureAnswer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'configure',
        message: `Configure this ${label} now?`,
        default: false,
      },
    ]);

    if (configureAnswer.configure) {
      config = await promptSkillConfig(selected.configSchema);
    }
  }

  const addSpinner = ora('Adding to spec.yaml...').start();
  const moduleType = explicitType ?? selected.moduleType ?? DEFAULT_MODULE_TYPE;
  await addModuleToSpec({
    name: selected.name,
    version: versionAnswer.version,
    source: selected.source,
    sourceConfig: selected.sourceConfig,
    config,
    moduleType,
    clientInstallScope: options.installScope,
  });
  addSpinner.succeed('Added to spec.yaml');

  if (options.installScope === 'user') {
    console.log(chalk.gray('Set client.installScope: user (skills/agents under home directory).'));
  } else if (options.installScope === 'project') {
    console.log(chalk.gray('Set client.installScope: project (repo-local skill/agent trees).'));
  }

  const installAnswer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'install',
      message: 'Install now?',
      default: true,
    },
  ]);

  if (installAnswer.install) {
    await runApply(process.cwd());
  }

  console.log(chalk.green(`\n✓ ${selected.name} added successfully!`));
}

/**
 * COMMAND: aistack add
 *
 * Legacy entry point: add any module type (prefer `skill add`, `subagent add`, `hook add`).
 */
function registerAddCommand(program: Command) {
  program
    .command('add [name]')
    .description('Add a module to spec.yaml (prefer: skill add | subagent add | hook add)')
    .option('-s, --source <type>', 'Source type (github, npm, registry)')
    .option('--type <kind>', 'Module type: skill | subagent | hook (when not using a typed subcommand)')
    .option('--save-dev', 'Add as dev dependency')
    .addOption(installScopeCliOption())
    .action(async (nameArg, options) => {
      try {
        await executeAddModuleFlow({ nameArg, options });
      } catch (error) {
        handleError(error);
      }
    });
}

function registerRemoveCommand(program: Command) {
  program
    .command('remove <skill>')
    .description('Remove a module from spec.yaml (skills or modules)')
    .action(async (skillName: string) => {
      try {
        await removeModuleFromSpec(skillName);
        console.log(chalk.green(`Removed "${skillName}" from spec.yaml`));
      } catch (e) {
        handleError(e);
      }
    });
}

function registerListCommand(program: Command) {
  program.command('list').description('List modules in spec.yaml').action(async () => {
    try {
      const spec = await readSpec();
      const rows = flattenSpecModules(spec);
      rows.forEach((s) => {
        const kind = s.moduleType ?? DEFAULT_MODULE_TYPE;
        console.log(`  - ${s.name} [${kind}] (${s.source})`);
      });
    } catch (e) {
      handleError(e);
    }
  });
}

function registerStatusCommand(program: Command) {
  program.command('status').description('Show project / spec status').action(() => {
    console.log(chalk.cyan(`Run \`${CLI_COMMAND} sync\` to apply. Status view coming soon.`));
  });
}

function registerUpdateCommand(program: Command) {
  program.command('update [skill]').description('Update skills').action(() => {
    console.log(chalk.yellow('Not implemented — bump versions in spec.yaml and run sync.'));
  });
}

function registerValidateCommand(program: Command) {
  program.command('validate').description('Validate spec.yaml').action(async () => {
    const r = await validateSpecFile();
    if (r.valid) {
      console.log(chalk.green('spec.yaml is valid.'));
    } else {
      console.error(chalk.red('spec.yaml is invalid:'));
      r.errors?.forEach((err: any) => console.error(`  ${err.path}: ${err.message}`));
      process.exit(1);
    }
  });
}

function registerCleanCommand(program: Command) {
  program.command('clean').description('Clean local cache').action(() => {
    console.log(chalk.yellow('Not implemented yet.'));
  });
}

function registerCatalogCommands(program: Command) {
  const catalog = program.command('catalog').description('Compare configured skill sources with spec.yaml');

  catalog
    .command('refresh')
    .description(
      'List catalog modules missing from spec.yaml; with --write, append rows under modules (additive YAML merge)'
    )
    .option('--write', 'Append modules to spec.yaml (creates modules: if missing; backs up first)')
    .option('-y, --yes', 'With --write: non-interactive — append first --max new catalog names')
    .option(
      '--refresh-sources',
      'Delete local GitHub catalog listing cache (.cache/.../github-catalog) then re-fetch from API'
    )
    .option('--max <n>', 'With --write -y: max modules to append in one run (default: 500)', '500')
    .option('--json', 'Machine-readable output')
    .action(async (options) => {
      try {
        const max = Math.max(1, parseInt(String(options.max), 10) || 500);
        await runCatalogRefresh({
          cwd: process.cwd(),
          write: Boolean(options.write),
          yes: Boolean(options.yes),
          refreshSources: Boolean(options.refreshSources),
          max,
          json: Boolean(options.json),
        });
      } catch (e) {
        handleError(e);
      }
    });
}

/**
 * COMMAND: aistack search
 *
 * Search all module kinds (or use `skill search`, `subagent search`, `hook search`).
 */
function registerSearchCommand(program: Command) {
  program
    .command('search <query>')
    .description('Search AI modules (skills, subagents, hooks)')
    .option('-l, --limit <number>', 'Limit results', '20')
    .option('-t, --tag <tag>', 'Filter by tag')
    .option('--type <kind>', 'Filter by module type: skill | subagent | hook')
    .option('--client <type>', 'Filter by client type')
    .option('--json', 'Output as JSON')
    .action(async (query, options) => {
      const spinner = ora('Searching...').start();

      try {
        const moduleTypes = options.type ? [parseModuleTypeCli(options.type)] : undefined;
        const results = await searchModules(query, {
          cwd: process.cwd(),
          limit: parseInt(options.limit),
          tags: options.tag ? [options.tag] : undefined,
          client: options.client,
          moduleTypes,
        });

        spinner.succeed(`Found ${results.length} module(s)`);

        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }

        if (results.length === 0) {
          console.log(chalk.yellow('\nNo modules found'));
          return;
        }

        // Display results as table
        console.log();
        displaySearchResults(results);

        console.log(chalk.gray(`\nShowing ${results.length} results`));
        console.log(
          chalk.gray(
            `Run ${chalk.cyan(`${CLI_COMMAND} info <name>`)} or ${chalk.cyan(`${CLI_COMMAND} skill|subagent|hook info <name>`)}`
          )
        );

      } catch (error) {
        spinner.fail('Search failed');
        handleError(error);
      }
    });
}

/**
 * COMMAND: aistack info
 *
 * Show skill details
 */
function registerInfoCommand(program: Command) {
  program
    .command('info <name>')
    .description('Show catalog metadata for a module (prefer: skill info | subagent info | hook info)')
    .option('--json', 'Output as JSON')
    .action(async (name, options) => {
      const spinner = ora(`Fetching ${name}…`).start();

      try {
        const info = await getModuleInfo(name);
        spinner.succeed();

        if (options.json) {
          console.log(JSON.stringify(info, null, 2));
          return;
        }

        displayModuleInfo(info);

      } catch (error) {
        spinner.fail('Failed to fetch info');
        handleError(error);
      }
    });
}

function registerInstallCommand(program: Command) {
  program
    .command('install')
    .description('Resolve, fetch, and install skills from spec.yaml')
    .action(async () => {
      const spinner = ora('Installing…').start();
      try {
        const result = await runApply(process.cwd());
        spinner.succeed(`Installed / refreshed ${result.skillsInstalled} skill(s)`);
      } catch (e) {
        spinner.fail('Install failed');
        handleError(e);
      }
    });
}

function registerApplyCommand(program: Command) {
  program
    .command('apply')
    .description('Run full apply pipeline (install + client adapter)')
    .action(async () => {
      const spinner = ora('Applying…').start();
      try {
        await runApply(process.cwd());
        spinner.succeed('Apply complete');
      } catch (e) {
        spinner.fail('Apply failed');
        handleError(e);
      }
    });
}

/**
 * COMMAND: aistack sync
 *
 * Install and apply skills
 */
function registerSyncCommand(program: Command) {
  program
    .command('sync')
    .description('Sync skills (install + apply)')
    .option('-f, --force', 'Force reinstall')
    .action(async (options) => {
      console.log(chalk.cyan('Syncing skills...\n'));

      try {
        const spinner = ora('Validating spec.yaml...').start();
        const validation = await validateSpecFile();
        if (!validation.valid) {
          spinner.fail('Spec validation failed');
          throw { code: 'VALIDATION_ERROR', errors: validation.errors };
        }
        spinner.succeed('Spec validated');

        spinner.start('Running apply pipeline (resolve → install → adapter)...');
        const applyResult = await runApply(process.cwd());
        spinner.succeed(
          `Done — skills processed: ${applyResult.skillsResolved}, files written: ${applyResult.adapterReport?.written.length ?? 0}`
        );

        if (!applyResult.success) {
          console.log(chalk.yellow('\nCompleted with warnings (see errors below).'));
          applyResult.errors.forEach((e) =>
            console.log(chalk.yellow(`  ${e.skill ?? e.phase}: ${e.message}`))
          );
        }

        console.log(chalk.green('\n✓ Sync complete!'));

        displaySyncSummary({
          installed: applyResult.skillsInstalled,
          updated: 0,
          applied: applyResult.adapterReport?.written.length ?? 0,
        });

      } catch (error) {
        handleError(error);
      }
    });
}

function registerModuleKindCommandGroups(program: Command) {
  const groups: {
    kind: AIModuleType;
    cmd: string;
    description: string;
    searchFn: typeof searchSkills;
    display: (info: any) => void;
  }[] = [
    {
      kind: 'skill',
      cmd: 'skill',
      description: 'Prompt-pack skills (skill.json / SKILL.md paths in sources)',
      searchFn: searchSkills,
      display: displaySkillInfo,
    },
    {
      kind: 'subagent',
      cmd: 'subagent',
      description: 'Task subagents (agent.json paths in sources)',
      searchFn: searchSubagents,
      display: displaySubagentInfo,
    },
    {
      kind: 'hook',
      cmd: 'hook',
      description: 'Lifecycle hooks (hook.json paths in sources)',
      searchFn: searchHooks,
      display: displayHookInfo,
    },
  ];

  for (const g of groups) {
    const root = program.command(g.cmd).description(g.description);

    root
      .command('search <query>')
      .description(`Search configured catalogs for ${g.cmd}s`)
      .option('-l, --limit <number>', 'Limit results', '20')
      .option('-t, --tag <tag>', 'Filter by tag')
      .option('--client <type>', 'Filter by client type')
      .option('--json', 'Output as JSON')
      .action(async (query, options) => {
        const spinner = ora('Searching...').start();
        try {
          const results = await g.searchFn(query, {
            cwd: process.cwd(),
            limit: parseInt(options.limit, 10) || 20,
            tags: options.tag ? [options.tag] : undefined,
            client: options.client,
          });
          spinner.succeed(`Found ${results.length} ${g.cmd}(s)`);
          if (options.json) {
            console.log(JSON.stringify(results, null, 2));
            return;
          }
          if (results.length === 0) {
            console.log(chalk.yellow(`No ${g.cmd}s matched.`));
            return;
          }
          console.log();
          displaySearchResults(results);
          console.log(
            chalk.gray(`\nRun ${chalk.cyan(`${CLI_COMMAND} ${g.cmd} info <name>`)} for details`)
          );
        } catch (e) {
          spinner.fail('Search failed');
          handleError(e);
        }
      });

    root
      .command('add [name]')
      .description(`Add a ${g.kind} entry to spec.yaml`)
      .option('-s, --source <type>', 'Source type (github, npm, registry)')
      .option('--save-dev', 'Add as dev dependency')
      .addOption(installScopeCliOption())
      .action(async (name, options) => {
        try {
          await executeAddModuleFlow({
            nameArg: name,
            options: {
              source: options.source,
              saveDev: options.saveDev,
              installScope: options.installScope,
            },
            lockedKind: g.kind,
          });
        } catch (e) {
          handleError(e);
        }
      });

    root
      .command('info <name>')
      .description(`Show catalog metadata for a ${g.cmd}`)
      .option('--json', 'Output as JSON')
      .action(async (name, options) => {
        const spinner = ora('Fetching…').start();
        try {
          const info = await getModuleInfo(name);
          spinner.succeed();
          if (options.json) {
            console.log(JSON.stringify(info, null, 2));
            return;
          }
          if (info.moduleType !== g.kind) {
            console.log(
              chalk.yellow(
                `Catalog reports moduleType "${info.moduleType ?? 'unknown'}" (this command group is ${g.cmd}).`
              )
            );
          }
          g.display(info);
        } catch (e) {
          spinner.fail('Lookup failed');
          handleError(e);
        }
      });
  }
}

/**
 * Helper: Display sync summary
 */
function displaySyncSummary(summary: any) {
  console.log();
  console.log(chalk.bold('Summary:'));
  console.log(`  ${chalk.green(figures.tick)} Installed: ${summary.installed}`);
  console.log(`  ${chalk.blue(figures.arrowUp)} Updated: ${summary.updated}`);
  console.log(`  ${chalk.cyan(figures.play)} Applied: ${summary.applied}`);
}

/**
 * Helper: Handle errors
 */
function handleError(error: any) {
  if (error.code === 'SPEC_NOT_FOUND') {
    console.error(chalk.red('\n✗ No spec.yaml found'));
    console.log(chalk.gray(`Run: ${CLI_COMMAND} init`));
  } else if (error.code === 'VALIDATION_ERROR') {
    console.error(chalk.red('\n✗ Validation failed:'));
    error.errors.forEach((err: any) => {
      console.log(chalk.red(`  ${figures.cross} ${err.path}: ${err.message}`));
    });
  } else if (error.code === 'NETWORK_ERROR') {
    console.error(chalk.red('\n✗ Network error'));
    console.log(chalk.gray('Try: --offline flag'));
  } else if (error.code === 'INVALID_MODULE_TYPE') {
    console.error(chalk.red('\n✗ Invalid --type'));
    console.log(chalk.gray(error.message));
  } else if (error.code === 'MODULE_NOT_FOUND') {
    console.error(chalk.red('\n✗ Not found in catalog'));
    console.log(chalk.gray(error.message));
  } else if (error.code === 'SPEC_MODULES_NOT_SEQUENCE') {
    console.error(chalk.red('\n✗ Cannot append to spec.yaml'));
    console.log(chalk.gray(error.message));
  } else if (error.code === 'SPEC_PARSE_ERROR') {
    console.error(chalk.red('\n✗ Invalid YAML'));
    console.log(chalk.gray(error.message));
  } else if (error.code === 'SPEC_APPEND_VALIDATION_FAILED') {
    console.error(chalk.red('\n✗ Append rolled back'));
    console.log(chalk.gray(error.message));
  } else {
    console.error(chalk.red('\n✗ Error:'), error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  }
  process.exit(1);
}

async function promptSkillConfig(_schema: unknown): Promise<Record<string, unknown>> {
  return {};
}

async function quickInit(client: { type: string }): Promise<void> {
  const adaptersSupported = new Set(['cursor', 'copilot', 'claude']);
  const clientType = adaptersSupported.has(client.type) ? client.type : 'cursor';
  if (clientType !== client.type) {
    console.log(
      chalk.gray(
        `Note: init --yes chose client.type "${clientType}" (detected "${client.type}" has no built-in adapter — use interactive init to pick copilot, claude, or cursor).`
      )
    );
  }
  await createSpecFile({
    project: {
      projectName: 'my-ide-setup',
      description: `${PRODUCT_NAME} project`,
      author: '',
    },
    client: clientType,
    skills: ['canvas', 'typescript-helper'],
    settings: { autoSync: false, verifyChecksums: true },
  });
  await ensureDefaultSourcesConfig(process.cwd());
}

/**
 * True when Node started this file as the script entrypoint.
 * Global installs often use a symlink (`bin/aistack` → `dist/cli/index.js`); compare realpaths so Commander runs.
 */
function shouldRunCliMain(): boolean {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  try {
    const invoked = realpathSync(path.resolve(argv1));
    const thisFile = realpathSync(fileURLToPath(import.meta.url));
    return invoked === thisFile;
  } catch {
    return false;
  }
}

if (shouldRunCliMain()) {
  createCLI()
    .parseAsync(process.argv)
    .catch((err: unknown) => {
      console.error(err);
      process.exit(1);
    });
}
