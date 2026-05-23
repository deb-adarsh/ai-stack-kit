import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseJsonSafe, deepMerge } from '../merge-json.js';
import { applyAdapterOutput } from '../apply-output.js';

describe('parseJsonSafe', () => {
  it('parses plain JSON', () => {
    assert.deepEqual(parseJsonSafe('{"a":1}'), { a: 1 });
  });

  it('parses JSONC with // line comments', () => {
    const text = `{
      // top comment
      "a": 1, // trailing comment
      "b": "http://example.com" // URL in string must survive
    }`;
    assert.deepEqual(parseJsonSafe(text), { a: 1, b: 'http://example.com' });
  });

  it('parses JSONC with /* block comments */', () => {
    const text = `{
      /* block
         comment */
      "x": "y"
    }`;
    assert.deepEqual(parseJsonSafe(text), { x: 'y' });
  });

  it('tolerates trailing commas', () => {
    assert.deepEqual(parseJsonSafe('{"a":1,}'), { a: 1 });
    assert.deepEqual(parseJsonSafe('{"a":[1,2,]}'), { a: [1, 2] });
  });

  it('returns null for non-objects', () => {
    assert.equal(parseJsonSafe('[]'), null);
    assert.equal(parseJsonSafe('"str"'), null);
  });
});

describe('deepMerge', () => {
  it('merges nested plain objects', () => {
    const out = deepMerge(
      { a: { x: 1, y: 2 }, b: 1 },
      { a: { y: 9, z: 3 }, c: 4 }
    );
    assert.deepEqual(out, { a: { x: 1, y: 9, z: 3 }, b: 1, c: 4 });
  });
});

describe('applyAdapterOutput JSON merge', () => {
  it('preserves JSONC-with-comments settings.json on merge', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'aistack-merge-'));
    const file = path.join(tmp, '.vscode', 'settings.json');
    await mkdir(path.dirname(file), { recursive: true });
    const original = `{
  // user setting
  "editor.tabSize": 2,
  "files.exclude": { "**/.DS_Store": true }
}
`;
    await writeFile(file, original, 'utf-8');

    const patch = JSON.stringify({ aistack: { copilot: { version: 1 } } }, null, 2) + '\n';

    const report = await applyAdapterOutput(
      {
        files: [
          {
            path: '.vscode/settings.json',
            pathAnchor: 'project',
            content: patch,
            mergeStrategy: 'merge',
            managed: false,
          },
        ],
        warnings: [],
      },
      tmp
    );

    assert.deepEqual(report.conflicts ?? [], []);
    assert.equal(report.merged.length, 1);
    const merged = await readFile(file, 'utf-8');
    const parsed = JSON.parse(merged) as Record<string, unknown>;
    assert.equal((parsed['editor.tabSize'] as number), 2);
    assert.deepEqual(parsed.aistack, { copilot: { version: 1 } });
  });

  it('skips JSON merge and reports conflict instead of writing markers', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'aistack-merge-'));
    const file = path.join(tmp, 'broken.json');
    await writeFile(file, 'not even close to json {{{', 'utf-8');

    const report = await applyAdapterOutput(
      {
        files: [
          {
            path: 'broken.json',
            pathAnchor: 'project',
            content: '{"ok":true}',
            mergeStrategy: 'merge',
            managed: false,
          },
        ],
        warnings: [],
      },
      tmp
    );

    assert.equal(report.conflicts?.length, 1);
    const after = await readFile(file, 'utf-8');
    assert.equal(after, 'not even close to json {{{', 'must not corrupt the file with conflict markers');
  });
});
