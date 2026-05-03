/**
 * Resolves {@link SkillReference} to a {@link SkillSource} implementation.
 *
 * Extensibility:
 * ```ts
 * const factory = SkillSourceFactory.withDefaults();
 * factory.register(new S3SkillSource(), { priority: 'first' });
 * const source = factory.getFor(ref);
 * const meta = await source.resolve(ref);
 * const files = await source.fetch(meta);
 * await source.install(meta, files, { installRoot: '...' });
 * ```
 */

import type { SkillReference } from '../types/skill.js';
import type { SkillSource } from './base/skill-source.js';
import { GitHubSource } from './github/github-source.js';
import { NpmSource } from './npm/npm-source.js';

export type SourceRegistrationPriority = 'first' | 'last';

export class SkillSourceFactory {
  private readonly sources: SkillSource[] = [];

  constructor(sources: SkillSource[] = []) {
    this.sources = [...sources];
  }

  /** Built-in GitHub + npm sources. */
  static withDefaults(): SkillSourceFactory {
    return new SkillSourceFactory([new GitHubSource(), new NpmSource()]);
  }

  /**
   * Register a custom source. Same `canHandle` wins first registration unless `priority: 'last'`.
   * For overrides (e.g. corporate GitHub proxy), register with `priority: 'first'`.
   */
  register(source: SkillSource, options: { priority?: SourceRegistrationPriority } = {}): void {
    if (options.priority === 'last') {
      this.sources.push(source);
    } else {
      this.sources.unshift(source);
    }
  }

  unregister(type: string): void {
    const idx = this.sources.findIndex((s) => s.type === type);
    if (idx >= 0) this.sources.splice(idx, 1);
  }

  /** Return the first source that {@link SkillSource.canHandle}s the reference. */
  getFor(ref: SkillReference): SkillSource {
    const source = this.sources.find((s) => s.canHandle(ref));
    if (!source) {
      throw new Error(
        `No SkillSource registered for source="${ref.source}". Register one with factory.register(new MySource()).`
      );
    }
    return source;
  }

  /** All registered sources (e.g. for health checks or listing). */
  list(): readonly SkillSource[] {
    return this.sources;
  }
}
