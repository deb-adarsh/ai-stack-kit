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
 * - aistack status / doctor   Project health checks
 */

import { Command, Option } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import figures from 'figures';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLI_COMMAND, PRODUCT_NAME } from '../branding.js';

/** Matches npm-installed package.json beside dist/ (single source of truth for --version). */
function readCliPackageVersion(): string {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const pkgPath = path.join(here, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: unknown };
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const CLI_VERSION = readCliPackageVersion();
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
  ensureProjectGitignoreForAistack,
  runStatus,
  runSyncAllScopes,
  cleanAistackCache,
  type RunApplyOptions,
} from './commands.js';
import { ensureProfileSpec } from '../api/profile-spec.js';
import { hasProfileSpec, userAistackRoot } from '../paths/aistack-paths.js';
import { getGlobalCliOptions, dryRunSuffix } from './cli-options.js';
import { promptSkillConfig } from './prompts.js';
import { printDoctorReport, runDoctor } from './doctor.js';
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
    .version(CLI_VERSION)
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
  registerDoctorCommand(program);
  registerProfileCommand(program);
  registerCatalogCommands(program);

  program.addHelpText(
    'after',
    `\nDocumentation: https://github.com/deb-adarsh/ai-stack-kit/blob/main/USER_GUIDE.md\n`
  );

  return program;
}

function runApplyOptionsFromGlobal(
  globalOpts: ReturnType<typeof getGlobalCliOptions>,
  extra?: { forceReinstall?: boolean }
): RunApplyOptions {
  return {
    dryRun: globalOpts.dryRun,
    verbose: globalOpts.verbose,
    forceReinstall: extra?.forceReinstall,
  };
}

const SUPPORTED_CLIENT_TYPES = new Set(['cursor', 'copilot', 'claude']);

function resolveInitClientType(raw: string): string {
  if (SUPPORTED_CLIENT_TYPES.has(raw)) return raw;
  if (raw === 'other') return 'cursor';
  return 'cursor';
}

function installScopeCliOption(): Option {
  return new Option(
    '--install-scope <scope>',
    'Set client.installScope in project spec.yaml: project (repo-local) or user (home dirs). Ignored with --profile (profile uses ~/.aistack/spec.yaml with installScope: user).'
  ).choices(['project', 'user']);
}

function profileCliOption(): Option {
  return new Option(
    '--profile, --global',
    'Add to ~/.aistack/spec.yaml (global profile) instead of the project spec in the current directory'
  );
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
    .action(async (options, cmd) => {
      const globalOpts = getGlobalCliOptions(cmd);
      const spinner = ora('Initializing project...').start();

      try {
        // Step 1: Detect client
        spinner.text = 'Detecting IDE/client...';
        const detectedClient = await detectClient();
        spinner.succeed(`Detected client: ${chalk.cyan(detectedClient.name)}`);

        if (options.yes) {
          await quickInit(detectedClient, globalOpts);
          spinner.succeed('Project initialized');
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
          {
            name: 'Other (advanced — defaults to cursor; edit spec.yaml)',
            value: 'other',
          },
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
        const clientType = resolveInitClientType(clientAnswer.client);
        if (clientType !== clientAnswer.client && clientAnswer.client !== 'other') {
          console.log(
            chalk.yellow(
              `Note: "${clientAnswer.client}" has no built-in adapter — using client.type "${clientType}".`
            )
          );
        }

        spinner.start('Creating spec.yaml...');
        await createSpecFile({
          project: projectAnswers,
          client: clientType,
          skills: skillNames,
          settings: settingsAnswers,
        });
        await ensureDefaultSourcesConfig(process.cwd());
        await ensureProjectGitignoreForAistack(process.cwd());
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
          await runApply(process.cwd(), runApplyOptionsFromGlobal(globalOpts));
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
  /** Passed through from `--install-scope`; updates spec client.installScope when set (project spec only). */
  installScope?: 'project' | 'user';
  /** Add to ~/.aistack/spec.yaml instead of project spec.yaml */
  profile?: boolean;
};

async function executeAddModuleFlow(params: {
  nameArg?: string;
  options: AddCliOptions;
  lockedKind?: AIModuleType;
  globalOpts?: ReturnType<typeof getGlobalCliOptions>;
}): Promise<void> {
  const { nameArg, options, lockedKind, globalOpts = { verbose: false, offline: false, dryRun: false } } =
    params;

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
      offline: globalOpts.offline,
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

  const versionChoices =
    versions.length <= 1 && versions[0] === 'latest'
      ? [{ name: 'latest (no other versions in catalog)', value: 'latest' }]
      : [
          { name: `latest${versions[0] && versions[0] !== 'latest' ? ` (${versions[0]})` : ''}`, value: 'latest' },
          new inquirer.Separator(),
          ...versions.filter((v) => v !== 'latest').slice(0, 10).map((v) => ({ name: v, value: v })),
        ];

  const versionAnswer = await inquirer.prompt([
    {
      type: 'list',
      name: 'version',
      message: 'Select version:',
      default: 'latest',
      choices: versionChoices,
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
      config = await promptSkillConfig(selected.name, selected.configSchema);
    }
  }

  const useProfile = Boolean(options.profile);
  let specRoot = process.cwd();

  if (useProfile) {
    let projectSpec;
    try {
      projectSpec = await readSpec();
    } catch {
      /* no project spec */
    }
    await ensureProfileSpec({ projectSpec });
    specRoot = userAistackRoot();
  }

  const addSpinner = ora(
    useProfile ? 'Adding to profile spec (~/.aistack/spec.yaml)...' : 'Adding to spec.yaml...'
  ).start();
  const moduleType = explicitType ?? selected.moduleType ?? DEFAULT_MODULE_TYPE;
  await addModuleToSpec(
    {
      name: selected.name,
      version: versionAnswer.version,
      source: selected.source,
      sourceConfig: selected.sourceConfig,
      config,
      moduleType,
      clientInstallScope: useProfile ? undefined : options.installScope,
    },
    specRoot
  );
  addSpinner.succeed(useProfile ? 'Added to profile spec' : 'Added to spec.yaml');

  if (!useProfile) {
    if (options.installScope === 'user') {
      console.log(chalk.gray('Set client.installScope: user (skills/agents under home directory).'));
    } else if (options.installScope === 'project') {
      console.log(chalk.gray('Set client.installScope: project (repo-local skill/agent trees).'));
    }
  } else {
    console.log(chalk.gray('Profile spec uses client.installScope: user (~/.cursor, etc.).'));
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
    if (useProfile) {
      await runApply(specRoot, runApplyOptionsFromGlobal(globalOpts));
    } else {
      await runSyncAllScopes(process.cwd(), runApplyOptionsFromGlobal(globalOpts));
    }
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
    .addOption(profileCliOption())
    .action(async (nameArg, options, cmd) => {
      try {
        await executeAddModuleFlow({
          nameArg,
          options: { ...options, profile: options.profile },
          globalOpts: getGlobalCliOptions(cmd),
        });
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
  program
    .command('status')
    .description('Show project / spec status')
    .action(async () => {
      try {
        const { rows, moduleCount, clientType } = await runStatus(process.cwd());
        console.log(chalk.cyan.bold('\nProject status\n'));
        for (const row of rows) {
          const icon = row.ok ? chalk.green(figures.tick) : chalk.red(figures.cross);
          console.log(`  ${icon}  ${chalk.bold(row.label)}: ${row.detail}`);
        }
        if (clientType) {
          console.log(chalk.gray(`\n  client.type: ${clientType} · modules: ${moduleCount}`));
        }
        console.log(chalk.gray(`\n  Run: ${CLI_COMMAND} sync  ·  ${CLI_COMMAND} doctor\n`));
      } catch (e) {
        handleError(e);
      }
    });
}

function registerUpdateCommand(program: Command) {
  program
    .command('update [skill]')
    .description('Update module versions (manual — edit spec.yaml and sync)')
    .action((skillName) => {
      console.log(chalk.yellow('\nAutomatic updates are not implemented yet.'));
      if (skillName) {
        console.log(chalk.gray(`  Bump the version for "${skillName}" in spec.yaml, then run:`));
      } else {
        console.log(chalk.gray('  Bump versions in spec.yaml, then run:'));
      }
      console.log(chalk.cyan(`  ${CLI_COMMAND} sync`));
      console.log(
        chalk.gray(
          '\n  To discover new catalog entries: aistack catalog refresh --write\n  Guide: https://github.com/deb-adarsh/ai-stack-kit/blob/main/USER_GUIDE.md\n'
        )
      );
      process.exit(2);
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
  program
    .command('clean')
    .description('Remove local catalog cache (.cache/aistack)')
    .action(async () => {
      const spinner = ora('Cleaning catalog cache…').start();
      try {
        const { removed } = await cleanAistackCache(process.cwd());
        if (removed.length === 0) {
          spinner.succeed('Nothing to clean (cache directory empty or missing)');
        } else {
          spinner.succeed(`Removed ${removed.length} cache entr${removed.length === 1 ? 'y' : 'ies'}`);
        }
      } catch (e) {
        spinner.fail('Clean failed');
        handleError(e);
      }
    });
}

function registerDoctorCommand(program: Command) {
  program
    .command('doctor')
    .description('Check environment, spec, and catalog configuration')
    .action(async () => {
      try {
        const { checks, ok } = await runDoctor(process.cwd());
        printDoctorReport(checks);
        if (!ok) {
          process.exit(1);
        }
        console.log(chalk.green('All checks passed.'));
      } catch (e) {
        handleError(e);
      }
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
    .action(async (query, options, cmd) => {
      const globalOpts = getGlobalCliOptions(cmd);
      const spinner = ora(
        globalOpts.offline ? 'Searching (offline)…' : 'Searching…'
      ).start();

      try {
        const moduleTypes = options.type ? [parseModuleTypeCli(options.type)] : undefined;
        const limit = parseInt(String(options.limit), 10) || 20;
        const results = await searchModules(query, {
          cwd: process.cwd(),
          limit,
          tags: options.tag ? [options.tag] : undefined,
          client: options.client,
          moduleTypes,
          offline: globalOpts.offline,
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
    .action(async (_options, cmd) => {
      const globalOpts = getGlobalCliOptions(cmd);
      const spinner = ora(`Installing…${dryRunSuffix(globalOpts.dryRun)}`).start();
      try {
        const result = await runApply(process.cwd(), runApplyOptionsFromGlobal(globalOpts));
        spinner.succeed(
          `Installed / refreshed ${result.skillsInstalled} skill(s)${dryRunSuffix(globalOpts.dryRun)}`
        );
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
    .action(async (_options, cmd) => {
      const globalOpts = getGlobalCliOptions(cmd);
      const spinner = ora(`Applying…${dryRunSuffix(globalOpts.dryRun)}`).start();
      try {
        await runApply(process.cwd(), runApplyOptionsFromGlobal(globalOpts));
        spinner.succeed(`Apply complete${dryRunSuffix(globalOpts.dryRun)}`);
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
    .description('Sync skills (install + apply) for project and/or profile specs')
    .option('-f, --force', 'Force reinstall')
    .action(async (options, cmd) => {
      const globalOpts = getGlobalCliOptions(cmd);
      const dryLabel = dryRunSuffix(globalOpts.dryRun);
      console.log(chalk.cyan(`Syncing skills…${dryLabel}\n`));

      try {
        const spinner = ora('Validating spec files...').start();
        const projectValidation = await validateSpecFile(process.cwd());
        if (!projectValidation.valid && existsSync(path.join(process.cwd(), 'spec.yaml'))) {
          spinner.fail('Project spec validation failed');
          throw { code: 'VALIDATION_ERROR', errors: projectValidation.errors };
        }
        if (hasProfileSpec()) {
          const profileValidation = await validateSpecFile(userAistackRoot());
          if (!profileValidation.valid) {
            spinner.fail('Profile spec validation failed');
            throw { code: 'VALIDATION_ERROR', errors: profileValidation.errors };
          }
        }
        spinner.succeed('Spec validated');

        spinner.start(`Running apply pipeline (resolve → install → adapter)…${dryLabel}`);
        const dual = await runSyncAllScopes(
          process.cwd(),
          runApplyOptionsFromGlobal(globalOpts, { forceReinstall: Boolean(options.force) })
        );

        if (dual.project) {
          const r = dual.project;
          console.log(
            chalk.gray(
              `  Project: resolved ${r.skillsResolved}, written ${r.adapterReport?.written.length ?? 0}`
            )
          );
          if (!r.success) {
            r.errors.forEach((e) =>
              console.log(chalk.yellow(`    ${e.skill ?? e.phase}: ${e.message}`))
            );
          }
        }
        if (dual.profile) {
          const r = dual.profile;
          console.log(
            chalk.gray(
              `  Profile: resolved ${r.skillsResolved}, written ${r.adapterReport?.written.length ?? 0}`
            )
          );
          if (!r.success) {
            r.errors.forEach((e) =>
              console.log(chalk.yellow(`    ${e.skill ?? e.phase}: ${e.message}`))
            );
          }
        }

        const primary = dual.project ?? dual.profile;
        spinner.succeed(
          primary
            ? `Done — skills processed: ${primary.skillsResolved}, files written: ${primary.adapterReport?.written.length ?? 0}${dryLabel}`
            : `No spec.yaml found (project or ~/.aistack)${dryLabel}`
        );

        if (!dual.project && !dual.profile) {
          console.log(chalk.yellow('\nNothing to sync — run aistack init or add with --profile'));
          process.exit(1);
        }

        const anyFailed =
          dual.project?.success === false || dual.profile?.success === false;
        if (anyFailed) {
          console.log(chalk.yellow('\nCompleted with warnings (see errors above).'));
        }

        console.log(chalk.green('\n✓ Sync complete!'));

        const installed =
          (dual.project?.skillsInstalled ?? 0) + (dual.profile?.skillsInstalled ?? 0);
        const applied =
          (dual.project?.adapterReport?.written.length ?? 0) +
          (dual.profile?.adapterReport?.written.length ?? 0);
        displaySyncSummary({ installed, updated: 0, applied });

      } catch (error) {
        handleError(error);
      }
    });
}

function registerProfileCommand(program: Command) {
  const profile = program
    .command('profile')
    .description('Manage the global profile spec at ~/.aistack/spec.yaml');

  profile
    .command('init')
    .description('Create ~/.aistack/spec.yaml and sources.config.yaml (installScope: user)')
    .action(async () => {
      const spinner = ora('Initializing profile…').start();
      try {
        let projectSpec;
        try {
          projectSpec = await readSpec();
        } catch {
          /* no project spec */
        }
        const root = await ensureProfileSpec({ projectSpec });
        spinner.succeed(`Profile ready at ${root}/spec.yaml`);
        console.log(chalk.gray('\n  Add modules: aistack skill add <name> --profile'));
        console.log(chalk.gray(`  Sync: ${CLI_COMMAND} sync\n`));
      } catch (e) {
        spinner.fail('Profile init failed');
        handleError(e);
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
      .action(async (query, options, cmd) => {
        const globalOpts = getGlobalCliOptions(cmd);
        const spinner = ora(globalOpts.offline ? 'Searching (offline)…' : 'Searching…').start();
        try {
          const results = await searchModules(query, {
            cwd: process.cwd(),
            limit: parseInt(options.limit, 10) || 20,
            tags: options.tag ? [options.tag] : undefined,
            client: options.client,
            moduleTypes: [g.kind],
            offline: globalOpts.offline,
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
      .addOption(profileCliOption())
      .action(async (name, options, cmd) => {
        try {
          await executeAddModuleFlow({
            nameArg: name,
            options: {
              source: options.source,
              saveDev: options.saveDev,
              installScope: options.installScope,
              profile: options.profile,
            },
            lockedKind: g.kind,
            globalOpts: getGlobalCliOptions(cmd),
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
  } else if (isGithubRateLimitError(error)) {
    console.error(chalk.red('\n✗ GitHub API rate limit or auth error'));
    printGithubTokenHint();
  } else {
    console.error(chalk.red('\n✗ Error:'), error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  }
  process.exit(1);
}

function isGithubRateLimitError(error: { message?: string }): boolean {
  const msg = (error.message ?? '').toLowerCase();
  return (
    msg.includes('rate limit') ||
    msg.includes('api rate limit') ||
    msg.includes('403') ||
    msg.includes('401') ||
    msg.includes('bad credentials')
  );
}

function printGithubTokenHint(): void {
  console.log(chalk.gray('\n  Higher GitHub API limits for search and catalogs:'));
  console.log(chalk.cyan('  export GITHUB_TOKEN=ghp_…'));
  console.log(
    chalk.gray(
      '  # fine-grained PAT: Contents read on public repos\n  https://github.com/deb-adarsh/ai-stack-kit/blob/main/USER_GUIDE.md#quick-start\n'
    )
  );
  console.log(chalk.gray('  Or use: aistack --offline search <query>'));
}

async function quickInit(
  client: { type: string },
  globalOpts: ReturnType<typeof getGlobalCliOptions>
): Promise<void> {
  const clientType = resolveInitClientType(
    SUPPORTED_CLIENT_TYPES.has(client.type) ? client.type : 'cursor'
  );
  if (clientType !== client.type && client.type !== 'unknown') {
    console.log(
      chalk.gray(
        `Note: init -y chose client.type "${clientType}" (detected "${client.type}" has no built-in adapter).`
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
    skills: [],
    settings: { autoSync: false, verifyChecksums: true },
  });
  await ensureDefaultSourcesConfig(process.cwd());
  await ensureProjectGitignoreForAistack(process.cwd());
  console.log(chalk.green('✔ Created spec.yaml and sources.config.yaml'));
  console.log(
    chalk.gray(`  Add modules: ${CLI_COMMAND} search <query>  ·  Skill browser: https://deb-adarsh.github.io/ai-stack-kit/`)
  );
  if (!globalOpts.dryRun) {
    console.log(chalk.gray(`  Then: ${CLI_COMMAND} sync`));
  }
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
