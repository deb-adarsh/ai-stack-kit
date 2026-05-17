import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
} from '@vscode/test-electron';

/** Pin VS Code for extension tests (matches `engines.vscode`). */
const VSCODE_TEST_VERSION = '1.85.2';

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, '../..');
  const extensionTestsPath = path.resolve(__dirname, './suite/index.js');
  const testWorkspace = path.resolve(extensionDevelopmentPath, 'test-workspace');

  const vscodeAppPath = await downloadAndUnzipVSCode(VSCODE_TEST_VERSION);
  const [cli, ...profileArgs] = resolveCliArgsFromVSCodeExecutablePath(vscodeAppPath);

  const args = [
    ...profileArgs,
    testWorkspace,
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--disable-updates',
    '--skip-welcome',
    '--skip-release-notes',
    '--disable-workspace-trust',
    `--extensionTestsPath=${extensionTestsPath}`,
    `--extensionDevelopmentPath=${extensionDevelopmentPath}`,
  ];

  const result = spawnSync(cli, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

main().catch((err) => {
  console.error('Failed to run tests', err);
  process.exit(1);
});
