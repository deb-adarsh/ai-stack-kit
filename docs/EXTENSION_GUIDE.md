# AI Stack Kit — VS Code / Cursor extension guide

The **[AI Stack Kit extension](https://marketplace.visualstudio.com/items?itemName=deb-adarsh.ai-stack-kit)** manages the same **`spec.yaml`** workflow as the CLI — inside the editor — with no global **`aistack`** install required.

Terminal-first? See **[CLI guide](./CLI_GUIDE.md)**. Overview and install options: **[README](../README.md)** · **[User guides](../USER_GUIDE.md)**.

---

## Install

**[Visual Studio Marketplace → AI Stack Kit](https://marketplace.visualstudio.com/items?itemName=deb-adarsh.ai-stack-kit)**

Quick Open (`Ctrl+P` / `Cmd+P`):

```text
ext install deb-adarsh.ai-stack-kit
```

Works in **VS Code** and **Cursor**. After updating, run **Developer: Reload Window** once.

---

## What you get

| Area | Purpose |
|------|---------|
| **Activity Bar → AI Stack Kit** | Sidebar container for all views |
| **Modules** | Skills, subagents, hooks in **`spec.yaml`** — enable, disable, remove |
| **Catalog** | Bundled catalog snapshot — search, **Add to spec**, copy id. **Globe** on the Catalog title bar opens the [hosted skill browser](https://deb-adarsh.github.io/ai-stack-kit/) in your browser. |
| **Outputs** | Generated paths for active **`client.type`** (open in editor) |

Default view order: **Modules → Catalog → Outputs** (you can drag to reorder; that layout is saved per machine).

---

## Quick start

1. **File → Open Folder** (a project root).
2. Command Palette → **AI Stack Kit: Initialize Workspace** (`aistack.init`).
3. Open **Catalog** — search and **Add to spec**, or **AI Stack Kit: Search Catalog…**.
4. **Sync** — status bar **$(sync) AI Stack**, or Command Palette → **AI Stack Kit: Sync**.

Right side of the status bar shows **`client.type`** and module count (click for **Doctor**).

---

## Commands

| Command | What it does |
|---------|----------------|
| **Initialize Workspace** | Create **`spec.yaml`** + **`sources.config.yaml`** |
| **Sync** | Run install + apply pipeline (respects dry-run setting) |
| **Doctor** | Health checks → Output panel |
| **Search Catalog…** | Quick pick from catalog → add to spec |
| **Switch Client** | Set **`cursor`** / **`copilot`** / **`claude`** + install scope |
| **Show Catalog Panel** | Focus sidebar **Catalog** webview |
| **Open Skill Browser (Web)** | Open [hosted skill browser](https://deb-adarsh.github.io/ai-stack-kit/) in your browser |
| **Open spec.yaml** | Open spec in editor |
| **Refresh Catalog List** | Preview modules in catalogs not yet in spec |

Globe (**$(globe)**) on the **Catalog** title bar opens the **web** skill browser, not the sidebar panel.

---

## Settings

**Settings → Extensions → AI Stack Kit**

| Setting | Purpose |
|---------|---------|
| `aiStackKit.clientType` | Default client on init / **Switch Client** |
| `aiStackKit.installScope` | `project` (repo) or `user` (home dirs) |
| `aiStackKit.githubToken` | GitHub PAT for catalog search (like **`GITHUB_TOKEN`** for CLI) |
| `aiStackKit.dryRun` | Sync previews only — no writes |
| `aiStackKit.autoSyncOnSave` | Sync when **`spec.yaml`** is saved |

---

## Catalog panel vs web skill browser

| | **Catalog** (sidebar) | **Skill browser** (web) |
|--|------------------------|-------------------------|
| **Open via** | Activity Bar → Catalog | Globe icon or **Open Skill Browser (Web)** |
| **Data** | Bundled snapshot at publish time | Live rebuild from upstream on deploy |
| **Best for** | Add modules while coding | Browse ecosystem, copy `npx` commands |

In the Catalog panel, use **Full skill browser ↗** to open the hosted site.

---

## CLI vs extension

Same engine (**`AistackWorkspace`** / apply pipeline). Use either or both:

- **Extension** — visual trees, catalog UI, sync from status bar.
- **CLI** — scripts, CI, `aistack catalog refresh --write`, terminal search.

Changes to **`spec.yaml`** from either surface are picked up by both after **Sync**.

---

## Troubleshooting

| Problem | Try |
|---------|-----|
| Extension inactive | Open folder workspace; open **Modules** or run **Initialize** |
| Catalog empty / no search hits | Reload window; update extension (≥ 1.1.4 fixes catalog bundle) |
| Sync failed | **View → Output → AI Stack Kit**; set **`aiStackKit.githubToken`** if GitHub sources fail |
| Globe does nothing | Update to latest extension; opens https://deb-adarsh.github.io/ai-stack-kit/ |
| No Activity Bar icon; views under **Explorer** | Update to **1.2.2**, **View: Reset View Locations**, reload. Enable **AI Stack Kit** in the Activity Bar right-click menu if needed. |
| “Could not open the Catalog panel” | Update to **1.2.2**; **View: Reset View Locations**, then **AI Stack Kit: Show Catalog Panel**. |
| Activity Bar icon missing from visibility menu | Update to **1.2.2** (single SVG icon); reinstall extension and reload window. |

---

## Developers

From repo root:

```bash
npm run build:extension
cd extension && code --install-extension ai-stack-kit-*.vsix   # optional
```

Press **F5** in **`extension/`** for Extension Development Host. Tests: `npm run test:extension`.

---

## See also

- **[CLI guide](./CLI_GUIDE.md)**
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** — extension host + pipeline
- **[extension/README.md](../extension/README.md)** — Marketplace listing copy
