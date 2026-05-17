import { useCallback, useEffect, useMemo, useState } from 'react';

type Skill = {
  id: string;
  skillFolder: string;
  description: string;
  catalogId: string;
  publisherId: string;
  publisherLabel: string;
  publisherFamily?: string;
  publisherChannel?: string | null;
  repo: string;
  supportedClients: string[];
  moduleType: string;
  githubBrowse: string | null;
};

type Catalog = {
  generatedAt: string;
  count: number;
  publisherFamilies?: string[];
  publishers: string[];
  skills: Skill[];
};

const MODULE_TYPES = ['skill', 'subagent', 'hook'] as const;
type ModuleTypeFilter = (typeof MODULE_TYPES)[number] | '';

const USER_GUIDE_URL = 'https://github.com/deb-adarsh/ai-stack-kit/blob/main/USER_GUIDE.md';

function skillFamily(s: Skill): string {
  return s.publisherFamily ?? s.publisherLabel;
}

/** Public repo shorthand — works with `npx` without GitHub Packages PAT (see README). */
const CLI_NPX_SPEC = 'github:deb-adarsh/ai-stack-kit';

function metaLine(s: Skill): string {
  const parts: string[] = [skillFamily(s)];
  const ch = s.publisherChannel;
  if (ch) parts.push(ch);
  else if (s.publisherLabel !== skillFamily(s)) parts.push(s.publisherLabel);
  if (s.repo) parts.push(s.repo);
  return parts.join(' · ');
}

function npxInit() {
  return `npx ${CLI_NPX_SPEC} init`;
}

function npxAdd(id: string) {
  return `npx ${CLI_NPX_SPEC} skill add "${id}"`;
}

function npxSync() {
  return `npx ${CLI_NPX_SPEC} sync`;
}

async function loadCatalog(): Promise<Catalog> {
  const res = await fetch('./catalog.json', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Missing catalog.json (HTTP ${res.status}). Run: npm run build:catalog from repo root.`);
  }
  return res.json() as Promise<Catalog>;
}

function readFiltersFromUrl(): {
  q: string;
  client: string | null;
  moduleType: ModuleTypeFilter;
} {
  const params = new URLSearchParams(window.location.search);
  const mt = (params.get('type') ?? '').toLowerCase();
  const moduleType = MODULE_TYPES.includes(mt as (typeof MODULE_TYPES)[number])
    ? (mt as (typeof MODULE_TYPES)[number])
    : '';
  return {
    q: params.get('q') ?? '',
    client: params.get('client') || null,
    moduleType,
  };
}

function writeFiltersToUrl(q: string, clientPick: string | null, moduleType: ModuleTypeFilter) {
  const params = new URLSearchParams();
  const qt = q.trim();
  if (qt) params.set('q', qt);
  if (clientPick) params.set('client', clientPick);
  if (moduleType) params.set('type', moduleType);
  const next = params.toString();
  const url = next ? `${window.location.pathname}?${next}` : window.location.pathname;
  window.history.replaceState(null, '', url);
}

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(() => readFiltersFromUrl().q);
  const [familyPick, setFamilyPick] = useState<Set<string>>(new Set());
  const [pubPick, setPubPick] = useState<Set<string>>(new Set());
  const [clientPick, setClientPick] = useState<string | null>(() => readFiltersFromUrl().client);
  const [moduleTypePick, setModuleTypePick] = useState<ModuleTypeFilter>(() => readFiltersFromUrl().moduleType);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog()
      .then(setCatalog)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    writeFiltersToUrl(q, clientPick, moduleTypePick);
  }, [q, clientPick, moduleTypePick]);

  const copyText = useCallback(async (text: string, label = 'Copied!') => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(label);
    } catch {
      window.prompt('Copy:', text);
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const families = useMemo(() => {
    if (!catalog?.publisherFamilies?.length) {
      const s = new Set<string>();
      for (const sk of catalog?.skills ?? []) s.add(skillFamily(sk));
      return [...s].sort((a, b) => a.localeCompare(b));
    }
    return catalog.publisherFamilies;
  }, [catalog]);

  const clients = useMemo(() => {
    if (!catalog) return [];
    const s = new Set<string>();
    for (const sk of catalog.skills) {
      for (const c of sk.supportedClients ?? []) s.add(c);
    }
    return [...s].sort();
  }, [catalog]);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const qt = q.trim().toLowerCase();
    return catalog.skills.filter((s) => {
      if (familyPick.size && !familyPick.has(skillFamily(s))) return false;
      if (pubPick.size && !pubPick.has(s.publisherLabel)) return false;
      if (moduleTypePick && (s.moduleType ?? 'skill').toLowerCase() !== moduleTypePick) return false;
      if (
        clientPick &&
        !(s.supportedClients ?? []).some((c) => c.toLowerCase() === clientPick.toLowerCase())
      )
        return false;
      if (!qt) return true;
      const blob =
        `${s.id} ${s.skillFolder} ${s.description} ${s.repo} ${s.publisherLabel} ${skillFamily(s)} ${s.publisherChannel ?? ''} ${s.moduleType}`.toLowerCase();
      return blob.includes(qt);
    });
  }, [catalog, q, familyPick, pubPick, clientPick, moduleTypePick]);

  function toggleFamily(label: string) {
    setFamilyPick((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function togglePub(label: string) {
    setPubPick((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function clearFilters() {
    setQ('');
    setFamilyPick(new Set());
    setPubPick(new Set());
    setClientPick(null);
    setModuleTypePick('');
  }

  if (error) {
    return (
      <div className="shell">
        <div className="err">{error}</div>
        <p className="note">
          From repository root: <code>npm run build</code> then <code>npm run build:catalog</code>, then{' '}
          <code>npm run dev --prefix web</code>.
        </p>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="shell">
        <p className="muted">Loading catalog…</p>
      </div>
    );
  }

  return (
    <div className="shell">
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      <header className="hero">
        <div className="hero-top">
          <div className="hero-brand">
            <img
              className="hero-logo"
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt=""
              width={52}
              height={52}
              decoding="async"
            />
            <h1>
              AI Stack Kit
              <br />
              <span className="hero-sub">Skill browser</span>
            </h1>
          </div>
          <a className="docs-link" href={USER_GUIDE_URL} target="_blank" rel="noreferrer">
            Docs
          </a>
        </div>
        <p className="hero-lead">
          Curated GitHub skill trees: Copilot community, Anthropic, Microsoft, Azure, OpenAI, Google Cloud, Composio, and more.
          Filter by ecosystem or publisher, copy <code>npx</code> commands, then sync into your IDE.
        </p>
      </header>

      <section className="getting-started" aria-label="Getting started">
        <h2 className="getting-started-title">Getting started</h2>
        <ol className="getting-started-steps">
          <li>
            <code>{npxInit()}</code>
            <button type="button" className="copy copy-inline" onClick={() => copyText(npxInit(), 'Init command copied')}>
              Copy
            </button>
          </li>
          <li>
            <code>{npxAdd('<module-id>')}</code>
            <span className="step-hint"> — pick a module below</span>
          </li>
          <li>
            <code>{npxSync()}</code>
            <button type="button" className="copy copy-inline" onClick={() => copyText(npxSync(), 'Sync command copied')}>
              Copy
            </button>
          </li>
        </ol>
      </section>

      <div className="toolbar">
        <div className="search">
          <input
            type="search"
            placeholder="Search name, description, repo, ecosystem…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search skills"
          />
        </div>
        <select
          className="select-client"
          value={moduleTypePick}
          onChange={(e) => setModuleTypePick(e.target.value as ModuleTypeFilter)}
          aria-label="Filter by module type"
        >
          <option value="">All types</option>
          {MODULE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="select-client"
          value={clientPick ?? ''}
          onChange={(e) => setClientPick(e.target.value || null)}
          aria-label="Filter by client"
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <p className="filters-label filters-label-eco">
        <span className="filters-label-full">
          Ecosystem — Microsoft ↔ GitHub org + microsoft/skills + Azure repo; Google ↔ Cloud subtree
        </span>
        <span className="filters-label-short">Ecosystem</span>
      </p>
      <div className="pills">
        {families.map((f) => (
          <button
            key={f}
            type="button"
            className="pill pill-eco"
            data-on={familyPick.has(f)}
            onClick={() => toggleFamily(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <p className="filters-label filters-label-pub">
        <span className="filters-label-full">Publisher — GitHub organization / maintainer</span>
        <span className="filters-label-short">Publisher</span>
      </p>
      <div className="pills">
        {catalog.publishers.map((p) => (
          <button key={p} type="button" className="pill" data-on={pubPick.has(p)} onClick={() => togglePub(p)}>
            {p}
          </button>
        ))}
      </div>

      <p className="stats">
        Showing <strong>{filtered.length}</strong> of <strong>{catalog.count}</strong> modules · Updated{' '}
        {new Date(catalog.generatedAt).toLocaleString()}
      </p>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No modules match your filters.</p>
          <button type="button" className="copy" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="list list-grid">
          {filtered.map((s) => (
            <article key={s.id} className="card">
              <div className="card-top">
                <span className="skill-name">{s.skillFolder}</span>
                <span className="module-type-tag">{s.moduleType ?? 'skill'}</span>
                <span className="publisher">{metaLine(s)}</span>
              </div>
              <p className="desc">{s.description}</p>
              {!!s.supportedClients?.length && (
                <div className="clients">
                  {(s.supportedClients ?? []).map((c) => (
                    <span key={c} className="client-tag">
                      {c}
                    </span>
                  ))}
                </div>
              )}
              <div className="cmd-row">
                <code className="cmd">{npxAdd(s.id)}</code>
                <button
                  type="button"
                  className="copy"
                  onClick={() => copyText(npxAdd(s.id), 'Add command copied')}
                >
                  Copy add
                </button>
              </div>
              <div className="cmd-row">
                <code className="cmd">{npxSync()}</code>
                <button
                  type="button"
                  className="copy"
                  onClick={() => copyText(npxSync(), 'Sync command copied')}
                >
                  Copy sync
                </button>
              </div>
              {s.githubBrowse && (
                <p className="card-link">
                  <a href={s.githubBrowse} target="_blank" rel="noreferrer">
                    View on GitHub
                  </a>
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      <footer className="note">
        <strong>IDE targeting:</strong> set <code>client.type</code> in <code>spec.yaml</code> (<code>cursor</code>,{' '}
        <code>copilot</code>, <code>claude</code>). See the{' '}
        <a href={USER_GUIDE_URL} target="_blank" rel="noreferrer">
          user guide
        </a>
        .
        <br />
        <br />
        Microsoft skills:{' '}
        <a href="https://github.com/microsoft/skills/tree/main/.github/skills" target="_blank" rel="noreferrer">
          microsoft/skills (.github/skills)
        </a>
        ; Azure skills:{' '}
        <a href="https://github.com/microsoft/azure-skills/tree/main/skills" target="_blank" rel="noreferrer">
          microsoft/azure-skills
        </a>
        . OpenAI curated:{' '}
        <a href="https://github.com/openai/skills/tree/main/skills/.curated" target="_blank" rel="noreferrer">
          openai/skills/skills/.curated
        </a>
        . Google Cloud subtree:{' '}
        <a href="https://github.com/google/skills/tree/main/skills/cloud" target="_blank" rel="noreferrer">
          google/skills/skills/cloud
        </a>
        .
      </footer>
    </div>
  );
}
