# AI Stack Kit

Manage **skills**, **subagents**, and **hooks** from your IDE (VS Code or Cursor) — search catalogs, edit your stack, and sync to **Cursor**, **GitHub Copilot**, or **Claude** without a global CLI install.

## Install

- **VS Code 1.85+** — [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=deb-adarsh.ai-stack-kit)
- **Cursor / VSCodium / Gitpod** — [Open VSX Registry](https://open-vsx.org/extension/deb-adarsh/ai-stack-kit) (open **Extensions** panel in Cursor and search for **"AI Stack Kit"**)
- **Offline / pre-release** — grab the `.vsix` from a [GitHub release](https://github.com/deb-adarsh/ai-stack-kit/releases) and run `code --install-extension ai-stack-kit-*.vsix` (or `cursor --install-extension …`)

## Features

- **Modules** tree — **Project** (repo `spec.yaml`) and **Profile** (`~/.aistack/spec.yaml`) groups
- **Outputs** tree — generated paths for project and profile specs
- **Catalog** webview — two install targets:
  - **Add to project** → writes to the open repo's `spec.yaml`; sync installs into `.cursor/`, `.github/`, `.claude/` **inside the repo** (shared via git).
  - **Add to profile** → writes to `~/.aistack/spec.yaml` (your user account, **global**); sync installs into `~/.cursor`, `~/.copilot`, `~/.claude` so the module is available **across every project** on this machine, even without a folder open.
- **Commands** — Initialize, Sync (both specs), Doctor, Search/Add, Switch Client
- **Settings** — `aiStackKit.clientType`, `aiStackKit.githubToken`, `aiStackKit.dryRun`, `aiStackKit.autoSyncOnSave`

> **Project vs Profile**
> *Project* = scoped to this repo (versioned with your code).
> *Profile* = user-global — like a personal dotfiles install that follows you across every folder.

## Quick start

1. Open a project folder.
2. Run **AI Stack Kit: Initialize Workspace** from the Command Palette.
3. Browse **Catalog** — **Add to project** or **Add to profile** — or run **Search Catalog…**.
4. Run **Sync** (status bar: **$(sync) AI Stack**) — syncs project and profile specs when both exist.

Open the **AI Stack Kit** icon on the **Activity Bar** (far left) for **Modules → Catalog → Outputs**. The globe on **Catalog** opens the [hosted skill browser](https://deb-adarsh.github.io/ai-stack-kit/) in your browser.

## Settings

| Setting | Description |
|---------|-------------|
| `aiStackKit.clientType` | Default `cursor`, `copilot`, or `claude` on init |
| `aiStackKit.installScope` | Default install scope for **Initialize Workspace** (`project` or `user`) |
| `aiStackKit.githubToken` | GitHub PAT for catalog search (same role as `GITHUB_TOKEN` for the CLI) |
| `aiStackKit.dryRun` | Preview sync without writing files |
| `aiStackKit.autoSyncOnSave` | Sync when `spec.yaml` is saved |

## CLI

This extension bundles the same engine as the [AI Stack Kit CLI](https://github.com/deb-adarsh/ai-stack-kit). Install globally with `npm install -g ai-stack-kit` if you prefer the terminal.

## Documentation

- [Extension guide](https://github.com/deb-adarsh/ai-stack-kit/blob/main/docs/EXTENSION_GUIDE.md)
- [CLI guide](https://github.com/deb-adarsh/ai-stack-kit/blob/main/docs/CLI_GUIDE.md)
- [Architecture](https://github.com/deb-adarsh/ai-stack-kit/blob/main/ARCHITECTURE.md)

## Issues

Use **Help → Report Issue** or [GitHub Issues](https://github.com/deb-adarsh/ai-stack-kit/issues).
