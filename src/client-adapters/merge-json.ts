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

/**
 * Strip JSONC features (line/block comments, trailing commas) that VS Code
 * tolerates in `settings.json` but `JSON.parse` rejects. Preserves quoted
 * strings byte-for-byte so URLs and content with `//` aren't mangled.
 */
function stripJsonComments(raw: string): string {
  let out = '';
  let i = 0;
  const n = raw.length;
  let inString = false;
  let stringQuote = '';
  let inLineComment = false;
  let inBlockComment = false;

  while (i < n) {
    const ch = raw[i];
    const next = i + 1 < n ? raw[i + 1] : '';

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        out += ch;
      }
      i++;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (inString) {
      out += ch;
      if (ch === '\\' && i + 1 < n) {
        out += raw[i + 1];
        i += 2;
        continue;
      }
      if (ch === stringQuote) {
        inString = false;
      }
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      stringQuote = ch;
      out += ch;
      i++;
      continue;
    }
    if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }

  return out.replace(/,(\s*[\]}])/g, '$1');
}

export function parseJsonSafe(raw: string): Record<string, unknown> | null {
  const attempts = [raw, stripJsonComments(raw)];
  for (const text of attempts) {
    try {
      const v = JSON.parse(text) as unknown;
      if (isPlainObject(v)) return v;
    } catch {
      /* try next */
    }
  }
  return null;
}

export function stringifyJsonSorted(obj: Record<string, unknown>, indent = 2): string {
  return JSON.stringify(obj, null, indent) + '\n';
}
