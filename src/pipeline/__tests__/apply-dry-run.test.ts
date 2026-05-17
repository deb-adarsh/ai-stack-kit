import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { apply } from '../apply-pipeline.js';

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

describe('apply dry-run', () => {
  it('does not write skill install dirs or adapter outputs', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'aistack-apply-'));
    await writeFile(
      path.join(cwd, 'spec.yaml'),
      `version: "1.0"
client:
  type: cursor
skills:
  - name: placeholder
    version: latest
    source: local
    sourceConfig:
      path: .
    enabled: false
`,
      'utf-8'
    );

    const installRoot = path.join(cwd, '.aistack', 'skills');
    const cursorSkills = path.join(cwd, '.cursor', 'skills');

    const result = await apply({ projectRoot: cwd, dryRun: true });
    assert.equal(result.skillsInstalled, 0);
    assert.equal(await pathExists(installRoot), false);
    assert.equal(await pathExists(cursorSkills), false);
  });
});
