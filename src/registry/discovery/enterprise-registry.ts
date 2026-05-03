/**
 * Enterprise / private catalog: same HTTP contract as {@link RemoteApiRegistry},
 * with a convenience constructor for Bearer tokens and optional per-tenant headers.
 */

import { RemoteApiRegistry, type RemoteApiRegistryOptions } from './remote-api-registry.js';

export interface EnterpriseRegistryOptions extends RemoteApiRegistryOptions {
  bearerToken?: string;
  tenantId?: string;
}

export class EnterpriseRegistry extends RemoteApiRegistry {
  constructor(options: EnterpriseRegistryOptions) {
    const { bearerToken, tenantId, ...rest } = options;
    const headers: Record<string, string> = { ...rest.headers };
    if (bearerToken) {
      headers.Authorization = `Bearer ${bearerToken}`;
    }
    if (tenantId) {
      headers['X-Tenant-Id'] = tenantId;
    }
    super({ ...rest, headers });
  }
}
