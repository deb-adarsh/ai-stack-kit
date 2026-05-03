/**
 * Fetch public file text from raw.githubusercontent.com (does not consume REST API quota).
 */

export function rawGithubUrl(owner: string, repo: string, ref: string, filePath: string): string {
  const encRef = encodeURIComponent(ref);
  const segments = filePath.split('/').filter(Boolean).map((s) => encodeURIComponent(s));
  return `https://raw.githubusercontent.com/${owner}/${repo}/${encRef}/${segments.join('/')}`;
}

export async function fetchRawText(
  owner: string,
  repo: string,
  ref: string,
  filePath: string,
  fetchImpl: typeof fetch
): Promise<string | null> {
  const url = rawGithubUrl(owner, repo, ref, filePath);
  try {
    const res = await fetchImpl(url, { headers: { Accept: 'text/plain,*/*' } });
    if (!res.ok) return null;
    const t = await res.text();
    return t.length > 0 ? t : null;
  } catch {
    return null;
  }
}
