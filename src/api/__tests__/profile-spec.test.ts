import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureProfileSpec } from '../profile-spec.js';
import { userAistackRoot, userSpecPath } from '../../paths/aistack-paths.js';

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../../..');

describe('ensureProfileSpec', () => {
  let priorHome: string | undefined;
  let fakeHome: string;

  beforeEach(async () => {
    priorHome = process.env.HOME;
    fakeHome = await mkdtemp(path.join(tmpdir(), 'aistack-home-'));
    process.env.HOME = fakeHome;
  });

  afterEach(async () => {
    if (priorHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = priorHome;
    }
    await rm(fakeHome, { recursive: true, force: true });
  });

  it('creates ~/.aistack/spec.yaml with installScope user', async () => {
    process.env.AISTACK_SOURCES_CONFIG_TEMPLATE = path.join(
      repoRoot,
      'templates',
      'sources.config.yaml'
    );

    const root = await ensureProfileSpec({ clientType: 'cursor' });
    assert.equal(root, userAistackRoot());
    assert.ok(existsSync(userSpecPath()));
    assert.ok(existsSync(path.join(root, 'sources.config.yaml')));

    const specText = await readFile(userSpecPath(), 'utf-8');
    assert.match(specText, /installScope:\s*user/);
    assert.match(specText, /type:\s*cursor/);
  });
});
