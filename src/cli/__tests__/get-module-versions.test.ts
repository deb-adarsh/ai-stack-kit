import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getModuleVersions } from '../commands.js';

describe('getModuleVersions', () => {
  it('never returns fabricated semver tags when module is unknown', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'aistack-test-'));
    await writeFile(
      path.join(cwd, 'sources.config.yaml'),
      'version: 1\nsources: []\n',
      'utf-8'
    );

    const versions = await getModuleVersions('definitely-not-a-real-module-xyz', cwd);

    assert.deepEqual(versions, ['latest']);
    assert.ok(!versions.includes('1.0.0'));
    assert.ok(!versions.includes('0.9.0'));
  });
});
