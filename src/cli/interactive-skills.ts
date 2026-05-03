/**
 * Interactive flows: project summary, multi-select suggestions, search + pick.
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import type { ProjectSignals } from './project-detection.js';
import { summarizeSignals } from './project-detection.js';
import type { SuggestibleSkill } from './skill-suggestions.js';
import { filterSuggestible } from './skill-suggestions.js';

export function printProjectDetectionSummary(signals: ProjectSignals): void {
  const summary = summarizeSignals(signals);
  console.log(chalk.cyan('\nDetected project profile:'));
  console.log(chalk.white(`  ${summary}`));
  if (signals.usesReact || signals.usesNext) {
    console.log(chalk.gray('  → Prioritizing UI / component agents'));
  }
  if (signals.isNodeProject && (signals.backendHints.length || !(signals.usesReact || signals.usesNext))) {
    console.log(chalk.gray('  → Prioritizing Node / API agents'));
  }
  console.log();
}

function laneLabel(lane: SuggestibleSkill['lane']): string {
  if (lane === 'ui') return chalk.magenta('UI');
  if (lane === 'backend') return chalk.blue('API');
  return chalk.gray('shared');
}

function formatChoice(s: SuggestibleSkill): string {
  const rec = s.recommended ? chalk.green('★ ') : '  ';
  const score = chalk.dim(`(${Math.round(s.score * 100)}%)`);
  return `${rec}${laneLabel(s.lane)} ${chalk.cyan(s.name)} ${score} — ${chalk.dim(s.description)}`;
}

/**
 * Multi-select checkbox over suggestible skills (pre-checked when `recommended`).
 */
export async function promptMultiSelectSuggestibleSkills(
  skills: SuggestibleSkill[],
  options: { message?: string; minSelection?: number } = {}
): Promise<string[]> {
  const message = options.message ?? 'Select skills to include in spec.yaml:';
  const min = options.minSelection ?? 1;

  const answer = await inquirer.prompt<{ names: string[] }>([
    {
      type: 'checkbox',
      name: 'names',
      message,
      pageSize: 14,
      choices: skills.map((s) => ({
        name: formatChoice(s),
        value: s.name,
        checked: s.recommended,
      })),
      validate: (selected: string[]) =>
        selected.length >= min ? true : `Pick at least ${min} skill(s), or Ctrl+C to abort`,
    },
  ]);

  return answer.names;
}

/**
 * Search (local filter) + single-select list; returns chosen skill **name** or null.
 */
export async function promptSearchAndSelectSkill(
  catalog: SuggestibleSkill[],
  options: { message?: string } = {}
): Promise<string | null> {
  const { query } = await inquirer.prompt<{ query: string }>([
    {
      type: 'input',
      name: 'query',
      message: options.message ?? 'Search skills by name, tag, or description:',
      default: '',
    },
  ]);

  const matches = filterSuggestible(query, catalog);
  if (!matches.length) {
    console.log(chalk.yellow('No matches — try a shorter query or different keyword.'));
    return null;
  }

  const { picked } = await inquirer.prompt<{ picked: string }>([
    {
      type: 'list',
      name: 'picked',
      message: 'Select a skill:',
      pageSize: 12,
      choices: [
        ...matches.map((s) => ({
          name: formatChoice(s),
          value: s.name,
        })),
        new inquirer.Separator(),
        { name: chalk.dim('Cancel'), value: '__cancel__' },
      ],
    },
  ]);

  if (picked === '__cancel__') return null;
  return picked;
}

/**
 * Optional flow: after multi-select, offer one-off search-add.
 */
export async function promptOptionalSearchAdd(catalog: SuggestibleSkill[]): Promise<string[]> {
  const extra: string[] = [];
  let addMore = true;
  while (addMore) {
    const { action } = await inquirer.prompt<{ action: 'search' | 'done' }>([
      {
        type: 'list',
        name: 'action',
        message: 'Add another skill via search?',
        choices: [
          { name: 'Search & select…', value: 'search' },
          { name: 'Done', value: 'done' },
        ],
      },
    ]);
    if (action === 'done') break;
    const name = await promptSearchAndSelectSkill(catalog);
    if (name) extra.push(name);
    const { again } = await inquirer.prompt<{ again: boolean }>([
      { type: 'confirm', name: 'again', message: 'Search again?', default: false },
    ]);
    addMore = again;
  }
  return extra;
}
