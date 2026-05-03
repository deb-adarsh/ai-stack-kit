/**
 * CLI Prompt Flows
 * 
 * Interactive prompts using Inquirer
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { SkillMetadata } from '../types/skill.js';

/**
 * Prompt: Select skills (with search)
 */
export async function promptSelectSkills(
  skills: SkillMetadata[],
  options: { recommended?: string[] } = {}
): Promise<string[]> {
  const choices = skills.map(skill => ({
    name: formatSkillName(skill),
    value: skill.name,
    checked: options.recommended?.includes(skill.name) || false,
  }));

  const answer = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'skills',
      message: 'Select skills to install:',
      pageSize: 15,
      choices,
      validate: (input) => {
        if (input.length === 0) {
          return 'Please select at least one skill';
        }
        return true;
      },
    },
  ]);

  return answer.skills;
}

/**
 * Prompt: Search and select skill
 */
export async function promptSearchSkill(): Promise<string | null> {
  const searchAnswer = await inquirer.prompt([
    {
      type: 'input',
      name: 'query',
      message: 'Search for a skill:',
      validate: (input) => input.length > 0 || 'Please enter a search term',
    },
  ]);

  // This would call actual search function
  // For now, return the query
  return searchAnswer.query;
}

/**
 * Prompt: Confirm action
 */
export async function promptConfirm(
  message: string,
  defaultValue = true
): Promise<boolean> {
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue,
    },
  ]);

  return answer.confirmed;
}

/**
 * Prompt: Select version
 */
export async function promptSelectVersion(
  skillName: string,
  versions: string[]
): Promise<string> {
  const choices = [
    { name: `latest ${chalk.gray(`(${versions[0]})`)}`, value: 'latest' },
    new inquirer.Separator(),
    ...versions.slice(0, 10).map(v => ({ name: v, value: v })),
  ];

  if (versions.length > 10) {
    choices.push(
      new inquirer.Separator(),
      { name: 'Specify custom version...', value: 'custom' }
    );
  }

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'version',
      message: `Select version for ${chalk.cyan(skillName)}:`,
      pageSize: 12,
      choices,
    },
  ]);

  if (answer.version === 'custom') {
    const customAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'version',
        message: 'Enter version or range:',
        default: '^' + versions[0],
        validate: (input) => input.length > 0 || 'Please enter a version',
      },
    ]);
    return customAnswer.version;
  }

  return answer.version;
}

/**
 * Prompt: Configure skill
 */
export async function promptSkillConfig(
  skillName: string,
  configSchema: any
): Promise<any> {
  console.log(chalk.cyan(`\nConfigure ${skillName}:`));

  const questions = Object.entries(configSchema.properties || {}).map(
    ([key, schema]: [string, any]) => {
      const question: any = {
        name: key,
        message: schema.description || key,
        default: schema.default,
      };

      // Map JSON schema types to inquirer types
      switch (schema.type) {
        case 'boolean':
          question.type = 'confirm';
          break;
        case 'number':
          question.type = 'number';
          question.validate = (input: any) => {
            if (isNaN(input)) return 'Please enter a number';
            if (schema.minimum !== undefined && input < schema.minimum) {
              return `Must be at least ${schema.minimum}`;
            }
            if (schema.maximum !== undefined && input > schema.maximum) {
              return `Must be at most ${schema.maximum}`;
            }
            return true;
          };
          break;
        case 'string':
          if (schema.enum) {
            question.type = 'list';
            question.choices = schema.enum;
          } else {
            question.type = 'input';
            if (schema.minLength) {
              question.validate = (input: string) =>
                input.length >= schema.minLength ||
                `Must be at least ${schema.minLength} characters`;
            }
          }
          break;
        case 'array':
          question.type = 'checkbox';
          question.choices = schema.items?.enum || [];
          break;
        default:
          question.type = 'input';
      }

      return question;
    }
  );

  const answers = await inquirer.prompt(questions);
  return answers;
}

/**
 * Prompt: Select client type
 */
export async function promptSelectClient(
  detected?: string
): Promise<string> {
  const choices = [
    { name: 'Cursor', value: 'cursor' },
    { name: 'VS Code', value: 'vscode' },
    { name: 'IntelliJ IDEA', value: 'intellij' },
    { name: 'Neovim', value: 'neovim' },
    { name: 'Vim', value: 'vim' },
    new inquirer.Separator(),
    { name: 'Other (specify)', value: 'other' },
  ];

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'client',
      message: 'Select your IDE/editor:',
      default: detected,
      choices,
    },
  ]);

  if (answer.client === 'other') {
    const customAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'client',
        message: 'Enter client name:',
        validate: (input) => input.length > 0 || 'Please enter a client name',
      },
    ]);
    return customAnswer.client;
  }

  return answer.client;
}

/**
 * Prompt: Select features
 */
export async function promptSelectFeatures(): Promise<string[]> {
  const answer = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'features',
      message: 'Select features to enable:',
      choices: [
        { name: 'Skills', value: 'skills', checked: true },
        { name: 'Rules', value: 'rules', checked: false },
        { name: 'Hooks', value: 'hooks', checked: true },
        { name: 'Settings', value: 'settings', checked: false },
        { name: 'Extensions', value: 'extensions', checked: false },
        { name: 'Snippets', value: 'snippets', checked: false },
      ],
      validate: (input) => {
        if (input.length === 0) {
          return 'Please select at least one feature';
        }
        return true;
      },
    },
  ]);

  return answer.features;
}

/**
 * Prompt: Project metadata
 */
export async function promptProjectMetadata(): Promise<{
  name: string;
  description: string;
  author: string;
  version: string;
}> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Project name:',
      default: 'my-ide-setup',
      validate: (input) => input.length > 0 || 'Please enter a project name',
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
    {
      type: 'input',
      name: 'version',
      message: 'Version:',
      default: '1.0.0',
    },
  ]);

  return answers;
}

/**
 * Prompt: Select from list with details
 */
export async function promptSelectWithPreview<T>(
  items: T[],
  options: {
    message: string;
    format: (item: T) => string;
    preview?: (item: T) => string;
  }
): Promise<T> {
  const choices = items.map((item, index) => ({
    name: options.format(item),
    value: index,
  }));

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message: options.message,
      pageSize: 10,
      choices,
    },
  ]);

  const selected = items[answer.selected];

  if (options.preview) {
    console.log('\n' + options.preview(selected));

    const confirm = await promptConfirm('Continue with this selection?');
    if (!confirm) {
      return promptSelectWithPreview(items, options);
    }
  }

  return selected;
}

/**
 * Format skill name for display
 */
function formatSkillName(skill: SkillMetadata): string {
  const name = chalk.cyan(skill.name);
  const version = chalk.gray(`v${skill.version}`);
  const desc = chalk.dim(skill.description?.slice(0, 50) || 'No description');
  const tags = skill.tags?.slice(0, 2).map(t => chalk.yellow(`#${t}`)).join(' ') || '';

  return `${name} ${version} - ${desc} ${tags}`;
}

/**
 * Progress indicator for multi-step process
 */
export async function promptMultiStep<T>(
  steps: Array<{
    name: string;
    prompt: () => Promise<any>;
  }>
): Promise<T> {
  console.log(chalk.cyan(`\nStarting setup (${steps.length} steps):\n`));

  const result: any = {};

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(chalk.gray(`[${i + 1}/${steps.length}]`), step.name);

    const answer = await step.prompt();
    Object.assign(result, answer);

    console.log();
  }

  return result;
}
