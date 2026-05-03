/**
 * Remote HTTP skill catalog. API contract is intentionally minimal and versionable.
 *
 * Expected endpoints (relative to `baseUrl`):
 * - GET `/{apiPrefix}/skills/search?q=&tags=&clients=&limit=&offset=&sort=`
 *   → `{ "results": RegistrySearchResult[] }`
 * - GET `/{apiPrefix}/skills/{name}?version=`
 *   → `{ "skill": RegistryEntryJson }` or 404
 *
 * Any 501/404 on search falls back to empty results; callers can chain {@link DefaultRegistry}.
 */

import type { RegistryEntry, RegistrySearchResult } from '../../types/registry.js';
import type { GetSkillOptions, RegistryProvider, RegistrySearchOptions } from './registry-provider.js';
import { parseRegistryEntryJson, type RegistryEntryJson } from './local-json-registry.js';

export interface RemoteApiRegistryOptions {
  baseUrl: string;
  /** Default: `/v1` */
  apiPrefix?: string;
  fetchImpl?: typeof fetch;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export class RemoteApiRegistry implements RegistryProvider {
  readonly id: string;
  private readonly baseUrl: string;
  private readonly apiPrefix: string;
  private readonly fetchImpl: typeof fetch;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;

  constructor(options: RemoteApiRegistryOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiPrefix = (options.apiPrefix ?? '/v1').replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.headers = {
      Accept: 'application/json',
      ...options.headers,
    };
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.id = `remote:${this.baseUrl}`;
  }

  /** Use for private / enterprise catalogs (Bearer, mTLS via custom fetch, etc.). */
  withHeaders(extra: Record<string, string>): RemoteApiRegistry {
    return new RemoteApiRegistry({
      baseUrl: this.baseUrl,
      apiPrefix: this.apiPrefix,
      fetchImpl: this.fetchImpl,
      headers: { ...this.headers, ...extra },
      timeoutMs: this.timeoutMs,
    });
  }

  private async request<T>(path: string): Promise<T> {
    const url = joinUrl(this.baseUrl, `${this.apiPrefix}${path}`);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(url, { headers: this.headers, signal: ctrl.signal });
      if (!res.ok) {
        throw new Error(`Registry HTTP ${res.status} for ${url}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(t);
    }
  }

  async search(query: string, options?: RegistrySearchOptions): Promise<RegistrySearchResult[]> {
    const params = new URLSearchParams();
    params.set('q', query);
    if (options?.tags?.length) params.set('tags', options.tags.join(','));
    if (options?.supportedClients?.length) params.set('clients', options.supportedClients.join(','));
    if (options?.limit != null) params.set('limit', String(options.limit));
    if (options?.offset != null) params.set('offset', String(options.offset));
    if (options?.sortBy) params.set('sort', options.sortBy);

    try {
      const data = await this.request<{ results: RegistrySearchResult[] }>(
        `/skills/search?${params.toString()}`
      );
      return data.results ?? [];
    } catch {
      return [];
    }
  }

  async getSkill(name: string, options?: GetSkillOptions): Promise<RegistryEntry | null> {
    const enc = encodeURIComponent(name);
    const v = options?.version ? `?version=${encodeURIComponent(options.version)}` : '';
    try {
      const data = await this.request<{ skill: RegistryEntryJson }>(`/skills/${enc}${v}`);
      if (!data.skill) return null;
      return parseRegistryEntryJson(data.skill);
    } catch {
      return null;
    }
  }
}
