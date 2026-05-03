/**
 * JSON deep-merge (plain objects only), array replacement, primitives from patch win.
 */

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, pv] of Object.entries(patch)) {
    const bv = out[k];
    if (isPlainObject(pv) && isPlainObject(bv)) {
      out[k] = deepMerge(bv as Record<string, unknown>, pv);
    } else {
      out[k] = pv;
    }
  }
  return out;
}

export function parseJsonSafe(raw: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(raw) as unknown;
    return isPlainObject(v) ? v : null;
  } catch {
    return null;
  }
}

export function stringifyJsonSorted(obj: Record<string, unknown>, indent = 2): string {
  return JSON.stringify(obj, null, indent) + '\n';
}
