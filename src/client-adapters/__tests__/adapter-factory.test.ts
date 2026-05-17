import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AdapterFactory } from '../adapter-factory.js';

describe('AdapterFactory', () => {
  it('throws a clear error for unknown client types', () => {
    assert.throws(
      () => AdapterFactory.getAdapter('not-a-real-client'),
      /No ClientAdapter for client type "not-a-real-client"/
    );
  });

  it('resolves built-in adapters', () => {
    assert.equal(AdapterFactory.getAdapter('cursor').name, 'cursor');
    assert.equal(AdapterFactory.getAdapter('copilot').name, 'copilot');
    assert.equal(AdapterFactory.getAdapter('claude').name, 'claude');
  });
});
