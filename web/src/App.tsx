import { useEffect, useMemo, useState } from 'react';

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

function skillFamily(s: Skill): string {
  return s.publisherFamily ?? s.publisherLabel;
}

function metaLine(s: Skill): string {
  const parts: string[] = [skillFamily(s)];
  const ch = s.publisherChannel;
  if (ch) parts.push(ch);
  else if (s.publisherLabel !== skillFamily(s)) parts.push(s.publisherLabel);
  if (s.repo) parts.push(s.repo);
  return parts.join(' · ');
}

function npxAdd(id: string) {
  return `npx ai-stack-kit@latest add "${id}"`;
}

function npxSync() {
  return `npx ai-stack-kit@latest sync`;
}

async function loadCatalog(): Promise<Catalog> {
  const res = await fetch('./catalog.json', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Missing catalog.json (HTTP ${res.status}). Run: npm run build:catalog from repo root.`);
  }
  return res.json() as Promise<Catalog>;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    window.prompt('Copy:', text);
  }
}

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [familyPick, setFamilyPick] = useState<Set<string>>(new Set());
  const [pubPick, setPubPick] = useState<Set<string>>(new Set());
  const [clientPick, setClientPick] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog()
      .then(setCatalog)
      .catch((e: Error) => setError(e.message));
  }, []);

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
      if (
        clientPick &&
        !(s.supportedClients ?? []).some((c) => c.toLowerCase() === clientPick.toLowerCase())
      )
        return false;
      if (!qt) return true;
      const blob =
        `${s.id} ${s.skillFolder} ${s.description} ${s.repo} ${s.publisherLabel} ${skillFamily(s)} ${s.publisherChannel ?? ''}`.toLowerCase();
      return blob.includes(qt);
    });
  }, [catalog, q, familyPick, pubPick, clientPick]);

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
      <header className="hero">
        <div className="hero-brand">
          <img
            className="hero-logo"
            src={`${import.meta.env.BASE_URL}favicon.svg`}
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
        <p className="hero-lead">
          Curated GitHub skill trees: Copilot community, Anthropic, Azure, Google Cloud, Composio, Antigravity, and more.
          Filter by <strong>ecosystem</strong> (Microsoft includes GitHub-hosted Copilot catalogs; Google includes Cloud
          subtree + Antigravity) or by GitHub org. Copy <code>npx</code>, run in a project with{' '}
          <code>aistack init</code>, then sync.
        </p>
      </header>

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
          Ecosystem — Microsoft ↔ GitHub org + Azure; Google ↔ Cloud repo + Antigravity
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
        Showing <strong>{filtered.length}</strong> of <strong>{catalog.count}</strong> skills · Updated{' '}
        {new Date(catalog.generatedAt).toLocaleString()}
      </p>

      <div className="list list-grid">
        {filtered.map((s) => (
          <article key={s.id} className="card">
            <div className="card-top">
              <span className="skill-name">{s.skillFolder}</span>
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
              <button type="button" className="copy" onClick={() => copyText(npxAdd(s.id))}>
                Copy add
              </button>
            </div>
            <div className="cmd-row">
              <code className="cmd">{npxSync()}</code>
              <button type="button" className="copy" onClick={() => copyText(npxSync())}>
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

      <footer className="note">
        <strong>IDE targeting:</strong> set <code>client.type</code> in <code>spec.yaml</code> (<code>cursor</code>,{' '}
        <code>copilot</code>, <code>claude</code>, …). Ecosystem filters group catalogs by maintainer relationship, not
        install location.
        <br />
        <br />
        Azure skills:{' '}
        <a href="https://github.com/microsoft/azure-skills/tree/main/skills" target="_blank" rel="noreferrer">
          microsoft/azure-skills
        </a>
        . Google Cloud subtree:{' '}
        <a href="https://github.com/google/skills/tree/main/skills/cloud" target="_blank" rel="noreferrer">
          google/skills/skills/cloud
        </a>
        . Layout inspired by{' '}
        <a href="https://officialskills.sh/" target="_blank" rel="noreferrer">
          officialskills.sh
        </a>
        .
      </footer>
    </div>
  );
}
