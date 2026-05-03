/**
 * Resolves `client.type` → {@link ClientAdapter}. Register new clients without touching core.
 */

import type { ClientAdapter } from './client-adapter.js';
import { ClaudeClientAdapter } from './claude/claude-adapter.js';
import { CopilotClientAdapter } from './copilot/copilot-adapter.js';
import { CursorClientAdapter } from './cursor/cursor-adapter.js';

export class AdapterFactory {
  private static _default: AdapterFactory | null = null;

  private adapters: ClientAdapter[] = [];

  constructor(adapters: ClientAdapter[] = []) {
    this.adapters = [...adapters];
  }

  /** Built-in adapters (Cursor, Claude, Copilot). */
  static ensureDefaults(): AdapterFactory {
    if (!AdapterFactory._default) {
      AdapterFactory._default = AdapterFactory.withDefaults();
    }
    return AdapterFactory._default;
  }

  /**
   * `AdapterFactory.getAdapter(spec.client.type)` — uses shared default registry.
   * For custom adapters: `AdapterFactory.register(new MyAdapter())` first.
   */
  static getAdapter(clientType: string): ClientAdapter {
    return AdapterFactory.ensureDefaults().getAdapter(clientType);
  }

  /** Register on the shared default factory (extensibility without core edits). */
  static register(adapter: ClientAdapter): void {
    AdapterFactory.ensureDefaults().register(adapter);
  }

  /** Register adapters (Cursor, Claude, …). Last registered wins on duplicate `supports`. */
  register(adapter: ClientAdapter): void {
    this.adapters.push(adapter);
  }

  getAdapter(clientType: string): ClientAdapter {
    const matches = this.adapters.filter((a) => a.supports(clientType));
    if (!matches.length) {
      throw new Error(
        `No ClientAdapter for client type "${clientType}". Built-in types: cursor, copilot, claude. For VS Code with GitHub Copilot use copilot. Custom clients: AdapterFactory.register(new MyAdapter()) before apply.`
      );
    }
    return matches[matches.length - 1]!;
  }

  list(): readonly ClientAdapter[] {
    return this.adapters;
  }

  static withDefaults(): AdapterFactory {
    const f = new AdapterFactory();
    f.register(new CursorClientAdapter());
    f.register(new ClaudeClientAdapter());
    f.register(new CopilotClientAdapter());
    return f;
  }
}
