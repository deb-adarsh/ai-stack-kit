import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CursorClientAdapter } from '../cursor/cursor-adapter.js';
import { partitionModulesByType } from '../emit-skill-agent-files.js';
import type { ResolvedSkill } from '../normalized.js';

function module(name: string, moduleType: string, files: Record<string, string>): ResolvedSkill {
  return {
    id: `${name}@1`,
    name,
    version: '1',
    files,
    manifest: null,
    metadata: { moduleType },
  };
}

describe('partitionModulesByType', () => {
  it('routes skills, subagents, and hooks to separate buckets', () => {
    const modules = [
      module('my-skill', 'skill', { 'SKILL.md': '# skill' }),
      module('reviewer', 'subagent', { 'reviewer.agent.md': '# agent' }),
      module('fmt-hook', 'hook', { 'hook.json': '{}' }),
    ];
    const parts = partitionModulesByType(modules);
    assert.equal(parts.skills.length, 1);
    assert.equal(parts.subagents.length, 1);
    assert.equal(parts.hooks.length, 1);
    assert.equal(parts.skills[0].name, 'my-skill');
    assert.equal(parts.subagents[0].name, 'reviewer');
  });
});

describe('CursorClientAdapter pass-through', () => {
  it('writes fetched files to skills and agents dirs without synthesis', () => {
    const adapter = new CursorClientAdapter();
    const output = adapter.generateConfig({
      modules: [
        module('canvas', 'skill', { 'SKILL.md': '# Canvas skill' }),
        module('planner', 'subagent', { 'planner.md': '# Planner agent' }),
      ],
      metadata: { specVersion: '1.0', generatedAt: '2026-01-01T00:00:00.000Z' },
      client: { type: 'cursor', installScope: 'project' },
      spec: { version: '1.0' },
    });

    const paths = output.files.map((f) => f.path);
    assert.ok(paths.some((p) => p.includes('.cursor/skills/canvas/SKILL.md')));
    assert.ok(paths.some((p) => p.includes('.cursor/agents/planner/planner.md')));
    assert.ok(!paths.some((p) => p.includes('.cursor/prompts/')));
  });
});
