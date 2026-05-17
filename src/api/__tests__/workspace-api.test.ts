import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AistackWorkspace } from '../workspace-api.js';

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../../..');

describe('AistackWorkspace', () => {
  it('init writes spec.yaml and sources.config.yaml', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'aistack-api-'));
    process.env.AISTACK_TEMPLATES_CLIENTS = path.join(repoRoot, 'templates', 'clients');
    process.env.AISTACK_SOURCES_CONFIG_TEMPLATE = path.join(
      repoRoot,
      'templates',
      'sources.config.yaml'
    );

    const ws = new AistackWorkspace(cwd);
    assert.equal(ws.hasSpec(), false);
    await ws.init({ clientType: 'copilot', skills: [] });
    assert.equal(ws.hasSpec(), true);
    assert.ok(existsSync(path.join(cwd, 'sources.config.yaml')));

    const specText = await readFile(ws.specPath, 'utf-8');
    assert.match(specText, /type:\s*copilot/);
  });
});
