export {};

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };

const vscode = acquireVsCodeApi();

type Skill = {
  id: string;
  skillFolder: string;
  description: string;
  moduleType: string;
  publisherLabel?: string;
  publisherFamily?: string;
  catalogId?: string;
};

let skills: Skill[] = [];
let loadError: string | null = null;

const app = document.getElementById('app')!;

app.innerHTML = `
  <style>
    :root {
      color: var(--vscode-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size, 13px);
    }
    body {
      margin: 0;
      padding: 12px 14px 20px;
      background: var(--vscode-sideBar-background, var(--vscode-editor-background));
    }
    h2 { margin: 0 0 4px; font-size: 1.15em; font-weight: 600; }
    .toolbar {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 12px 0 10px;
      position: sticky;
      top: 0;
      z-index: 2;
      padding-bottom: 8px;
      background: var(--vscode-sideBar-background, var(--vscode-editor-background));
    }
    .search-row { display: flex; gap: 8px; align-items: stretch; }
    .search-row input { flex: 1; min-width: 0; }
    input, select {
      box-sizing: border-box;
      padding: 6px 10px;
      border-radius: 4px;
      border: 1px solid var(--vscode-input-border, var(--vscode-widget-border, #454545));
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font: inherit;
      outline: none;
    }
    input:focus, select:focus {
      border-color: var(--vscode-focusBorder, #007fd4);
    }
    select { min-width: 7.5rem; }
    .meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-size: 0.85em;
      color: var(--vscode-descriptionForeground);
    }
    .card {
      border: 1px solid var(--vscode-panel-border, var(--vscode-widget-border));
      border-radius: 6px;
      padding: 10px 12px;
      margin: 0 0 8px;
      background: var(--vscode-editor-background);
    }
    .card h3 {
      margin: 0 0 4px;
      font-size: 1em;
      font-weight: 600;
      word-break: break-word;
    }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
    .badge {
      font-size: 0.75em;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }
    .desc {
      margin: 0 0 8px;
      font-size: 0.9em;
      color: var(--vscode-descriptionForeground);
      line-height: 1.4;
    }
    .actions { display: flex; flex-wrap: wrap; gap: 6px; }
    button {
      cursor: pointer;
      padding: 4px 10px;
      border-radius: 4px;
      border: none;
      font: inherit;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button:hover { opacity: 0.92; }
    .empty, .error, .loading {
      padding: 16px 8px;
      text-align: center;
      color: var(--vscode-descriptionForeground);
    }
    .error { color: var(--vscode-errorForeground, #f48771); }
    .toast {
      position: fixed;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--vscode-editorWidget-background, #333);
      color: var(--vscode-editorWidget-foreground, #eee);
      border: 1px solid var(--vscode-widget-border);
      padding: 8px 14px;
      border-radius: 6px;
      display: none;
      z-index: 9;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
  </style>
  <h2>Catalog</h2>
  <div class="toolbar">
    <div class="search-row">
      <input type="search" id="q" placeholder="Search by name, publisher, description…" autocomplete="off" spellcheck="false" />
      <select id="type" title="Module type">
        <option value="">All types</option>
        <option value="skill">Skills</option>
        <option value="subagent">Subagents</option>
        <option value="hook">Hooks</option>
      </select>
    </div>
    <div class="meta">
      <span id="count">Loading catalog…</span>
      <span id="hint"></span>
    </div>
  </div>
  <div id="list"><p class="loading">Loading catalog…</p></div>
  <div id="toast" class="toast"></div>
`;

function catalogUrl(): string {
  const fromBody = document.body.getAttribute('data-aistack-catalog');
  if (fromBody) return fromBody;
  const script = document.querySelector('script[src]') as HTMLScriptElement | null;
  if (script?.src) return new URL('../catalog.json', script.src).toString();
  return new URL('catalog.json', window.location.href).toString();
}

function haystack(s: Skill): string {
  return [
    s.id,
    s.skillFolder,
    s.description,
    s.moduleType,
    s.publisherLabel,
    s.publisherFamily,
    s.catalogId,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function updateMeta(shown: number, total: number): void {
  const count = document.getElementById('count')!;
  const hint = document.getElementById('hint')!;
  if (loadError) {
    count.textContent = 'Catalog unavailable';
    hint.textContent = '';
    return;
  }
  const q = (document.getElementById('q') as HTMLInputElement).value.trim();
  const t = (document.getElementById('type') as HTMLSelectElement).value;
  if (q || t) {
    count.textContent = `${shown} of ${total} modules`;
    hint.textContent = shown === 0 ? 'Try another term or type' : shown > 100 ? 'Showing first 100' : '';
  } else {
    count.textContent = `${total} modules in snapshot`;
    hint.textContent = '';
  }
}

function render(): void {
  const list = document.getElementById('list')!;
  if (loadError) {
    list.innerHTML = `<p class="error">${loadError}</p>`;
    updateMeta(0, 0);
    return;
  }
  const q = (document.getElementById('q') as HTMLInputElement).value.trim().toLowerCase();
  const t = (document.getElementById('type') as HTMLSelectElement).value;
  const filtered = skills.filter((s) => {
    const kind = s.moduleType || 'skill';
    if (t && kind !== t) return false;
    if (!q) return true;
    return haystack(s).includes(q);
  });
  updateMeta(Math.min(filtered.length, 100), skills.length);
  list.innerHTML = '';
  if (!filtered.length) {
    list.innerHTML = '<p class="empty">No matches — clear search or change type</p>';
    return;
  }
  for (const s of filtered.slice(0, 100)) {
    const card = document.createElement('article');
    card.className = 'card';
    const kind = s.moduleType || 'skill';
    const publisher = s.publisherLabel || s.publisherFamily || '';
    card.innerHTML = `
      <h3>${escapeHtml(s.skillFolder)}</h3>
      <div class="badges">
        <span class="badge">${escapeHtml(kind)}</span>
        ${publisher ? `<span class="badge">${escapeHtml(publisher)}</span>` : ''}
      </div>
      <p class="desc">${escapeHtml(s.description || s.id)}</p>
      <div class="actions"></div>
    `;
    const actions = card.querySelector('.actions')!;
    const addProject = document.createElement('button');
    addProject.textContent = 'Add to project';
    addProject.title =
      'Add to this repo\u2019s spec.yaml. Sync installs into .cursor / .github / .claude inside the open folder. Shared with the repo.';
    addProject.onclick = () => vscode.postMessage({ type: 'add', id: s.id, target: 'project' });
    const addProfile = document.createElement('button');
    addProfile.className = 'secondary';
    addProfile.textContent = 'Add to profile';
    addProfile.title =
      'Add to ~/.aistack/spec.yaml (user-global). Sync installs into ~/.cursor, ~/.copilot, ~/.claude so the module is available across every project on this machine.';
    addProfile.onclick = () => vscode.postMessage({ type: 'add', id: s.id, target: 'profile' });
    const copy = document.createElement('button');
    copy.className = 'secondary';
    copy.textContent = 'Copy id';
    copy.title = 'Copy the catalog id to clipboard';
    copy.onclick = () => vscode.postMessage({ type: 'copy', text: s.id });
    actions.append(addProject, addProfile, copy);
    list.append(card);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function load(): Promise<void> {
  try {
    const res = await fetch(catalogUrl());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    skills = data.skills ?? [];
    loadError = null;
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
    skills = [];
  }
  render();
}

let debounce: ReturnType<typeof setTimeout> | undefined;
document.getElementById('q')!.addEventListener('input', () => {
  clearTimeout(debounce);
  debounce = setTimeout(render, 120);
});
document.getElementById('type')!.addEventListener('change', render);

window.addEventListener('message', (e) => {
  if (e.data?.type === 'toast') {
    const t = document.getElementById('toast')!;
    t.textContent = e.data.text;
    t.style.display = 'block';
    setTimeout(() => (t.style.display = 'none'), 2000);
  }
});

void load();
