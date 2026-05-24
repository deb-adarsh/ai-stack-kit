import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

function workspaceRoot(): string {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'test workspace folder should be open');
  return folder.uri.fsPath;
}

suite('AI Stack Kit extension', () => {
  test('extension is listed', async () => {
    const ext = vscode.extensions.getExtension('deb-adarsh.ai-stack-kit');
    assert.ok(ext, 'deb-adarsh.ai-stack-kit should be installed in test host');
  });

  test('activates and registers commands', async () => {
    const ext = vscode.extensions.getExtension('deb-adarsh.ai-stack-kit');
    await ext?.activate();
    assert.strictEqual(ext?.isActive, true);

    const commands = await vscode.commands.getCommands(true);
    for (const id of [
      'aistack.init',
      'aistack.sync',
      'aistack.doctor',
      'aistack.search',
      'aistack.add',
      'aistack.reportIssue',
    ]) {
      assert.ok(commands.includes(id), `missing command ${id}`);
    }
  });

  test('init creates spec.yaml and sources.config.yaml', async function () {
    this.timeout(30_000);
    const root = workspaceRoot();
    const specPath = path.join(root, 'spec.yaml');
    const sourcesPath = path.join(root, 'sources.config.yaml');
    for (const p of [specPath, sourcesPath]) {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    }

    await vscode.commands.executeCommand('aistack.init');

    assert.ok(fs.existsSync(specPath), 'spec.yaml should exist after init');
    assert.ok(fs.existsSync(sourcesPath), 'sources.config.yaml should exist after init');
    const specText = fs.readFileSync(specPath, 'utf-8');
    assert.match(specText, /type:\s*copilot/);
  });

  test('dry-run sync does not write copilot skill outputs', async function () {
    this.timeout(90_000);
    const root = workspaceRoot();
    const specPath = path.join(root, 'spec.yaml');
    if (!fs.existsSync(specPath)) {
      await vscode.commands.executeCommand('aistack.init');
    }

    await vscode.workspace
      .getConfiguration('aiStackKit')
      .update('dryRun', true, vscode.ConfigurationTarget.Workspace);

    const skillsDir = path.join(root, '.github', 'skills');
    if (fs.existsSync(skillsDir)) {
      fs.rmSync(skillsDir, { recursive: true, force: true });
    }

    await vscode.commands.executeCommand('aistack.sync');

    assert.ok(
      !fs.existsSync(skillsDir),
      'dry-run sync should not create .github/skills/ for copilot client'
    );
  });

  test('overlapping sync requests apply the latest spec', async function () {
    this.timeout(120_000);
    const root = workspaceRoot();

    await vscode.workspace
      .getConfiguration('aiStackKit')
      .update('dryRun', false, vscode.ConfigurationTarget.Workspace);

    const specPath = path.join(root, 'spec.yaml');
    const skillsDir = path.join(root, '.github', 'skills');
    for (const p of [specPath, path.join(root, 'sources.config.yaml')]) {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    }
    for (const p of [skillsDir, path.join(root, '.aistack')]) {
      if (fs.existsSync(p)) {
        fs.rmSync(p, { recursive: true, force: true });
      }
    }

    await vscode.commands.executeCommand('aistack.init');
    const firstSync = vscode.commands.executeCommand('aistack.sync');

    const specText = fs.readFileSync(specPath, 'utf-8');
    fs.writeFileSync(
      specPath,
      specText.replace(
        'skills: []',
        [
          'skills:',
          '  - name: prompt-engineering',
          '    version: latest',
          '    source: github',
          '    sourceConfig:',
          '      owner: github',
          '      repo: awesome-copilot',
          '      path: skills/prompt-engineering',
        ].join('\n')
      ),
      'utf-8'
    );

    const secondSync = vscode.commands.executeCommand('aistack.sync');
    await Promise.all([firstSync, secondSync]);

    assert.ok(
      fs.existsSync(path.join(skillsDir, 'prompt-engineering', 'SKILL.md')),
      'queued follow-up sync should materialize skill files from the latest spec'
    );
  });
});
