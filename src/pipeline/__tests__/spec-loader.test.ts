import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadSpec } from '../spec-loader.js';

describe('loadSpec', () => {
  it('loads a minimal valid spec', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'aistack-spec-'));
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

    const spec = await loadSpec(cwd);
    assert.equal(spec.client.type, 'cursor');
    assert.equal(spec.skills?.length, 1);
  });

  it('loads an empty skills list (init / extension default)', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'aistack-spec-empty-'));
    await writeFile(
      path.join(cwd, 'spec.yaml'),
      `version: "1.0"
client:
  type: copilot
  features:
    - skills
    - hooks
skills: []
modules: []
settings:
  autoSync: false
  verifyChecksums: true
`,
      'utf-8'
    );

    const spec = await loadSpec(cwd);
    assert.equal(spec.client.type, 'copilot');
    assert.equal(spec.skills.length, 0);
  });

  it('rejects spec without client', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'aistack-spec-bad-'));
    await writeFile(
      path.join(cwd, 'spec.yaml'),
      `version: "1.0"
skills: []
`,
      'utf-8'
    );

    await assert.rejects(() => loadSpec(cwd), (err: unknown) => {
      return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'VALIDATION_ERROR';
    });
  });
});
