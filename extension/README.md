# AI Stack Kit

Manage **skills**, **subagents**, and **hooks** from your IDE (VS Code or Cursor) — search catalogs, edit your stack, and sync to **Cursor**, **GitHub Copilot**, or **Claude** without a global CLI install.

## Install

**[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=deb-adarsh.ai-stack-kit)** — use **Install** on that page (VS Code 1.85+ or Cursor).

## Features

- **Modules** tree — view and toggle modules in `spec.yaml`
- **Outputs** tree — open generated paths for the active `client.type`
- **Catalog** webview — search the bundled skill index and add modules to your spec
- **Commands** — Initialize, Sync, Doctor, Search/Add, Switch Client
- **Settings** — `aiStackKit.clientType`, `aiStackKit.githubToken`, `aiStackKit.dryRun`, `aiStackKit.autoSyncOnSave`

## Quick start

1. Open a project folder.
2. Run **AI Stack Kit: Initialize Workspace** from the Command Palette.
3. Browse **Catalog** or run **Search Catalog…** to add modules.
4. Run **Sync** (status bar: **$(sync) AI Stack**).

Open the **AI Stack Kit** icon on the **Activity Bar** (far left) for **Modules → Catalog → Outputs**. The globe on **Catalog** opens the [hosted skill browser](https://deb-adarsh.github.io/ai-stack-kit/) in your browser.

## Settings

| Setting | Description |
|---------|-------------|
| `aiStackKit.clientType` | Default `cursor`, `copilot`, or `claude` on init |
| `aiStackKit.installScope` | `project` or `user` install roots |
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
