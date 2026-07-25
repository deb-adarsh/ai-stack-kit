import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ensureClientInstallDirs } from '../ensure-client-dirs.js';

describe('ensureClientInstallDirs', () => {
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

  it('creates skills, agents, and hooks dirs on first user-scope sync', async () => {
    const skillsDir = path.join(fakeHome, '.cursor', 'skills');
    const agentsDir = path.join(fakeHome, '.cursor', 'agents');
    const hooksDir = path.join(fakeHome, '.cursor', 'hooks');
    assert.equal(existsSync(skillsDir), false);

    const created = await ensureClientInstallDirs(
      { type: 'cursor', installScope: 'user' },
      path.join(fakeHome, '.aistack')
    );

    assert.ok(created.includes(skillsDir));
    assert.ok(existsSync(agentsDir));
    assert.ok(existsSync(hooksDir));
  });

  it('creates ~/.copilot/skills and ~/.claude/skills for user scope', async () => {
    await ensureClientInstallDirs(
      { type: 'copilot', installScope: 'user' },
      path.join(fakeHome, '.aistack')
    );
    await ensureClientInstallDirs(
      { type: 'claude', installScope: 'user' },
      path.join(fakeHome, '.aistack')
    );

    assert.ok(existsSync(path.join(fakeHome, '.copilot', 'skills')));
    assert.ok(existsSync(path.join(fakeHome, '.claude', 'skills')));
  });
});
