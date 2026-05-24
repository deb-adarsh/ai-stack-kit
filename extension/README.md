# AI Stack Kit

<img width="1600" height="983" alt="ChatGPT Image May 24, 2026, 10_03_37 AM" src="https://github.com/user-attachments/assets/a7564158-d1ed-4b46-b0c5-556267ede891" />


Install reusable AI workflows like packages, directly from your IDE.

AI Stack Kit helps developers and AI engineers discover, install, and sync **skills**, **subagents**, and **hooks** across **Cursor**, **GitHub Copilot**, and **Claude**. Keep the workflows your team depends on in a repo-local `spec.yaml`, or add your personal toolkit once at the profile level and use it everywhere.

## Install

- **VS Code 1.85+**: [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=deb-adarsh.ai-stack-kit)
- **Cursor / VSCodium / Gitpod**: [Open VSX Registry](https://open-vsx.org/extension/deb-adarsh/ai-stack-kit) (open **Extensions** in Cursor and search for **"AI Stack Kit"**)
- **Offline / pre-release**: grab the `.vsix` from a [GitHub release](https://github.com/deb-adarsh/ai-stack-kit/releases) and run `code --install-extension ai-stack-kit-*.vsix` or `cursor --install-extension ai-stack-kit-*.vsix`

## Features

- **Browse AI workflows in your editor**: search the bundled catalog without leaving VS Code or Cursor.
- **Install to a project or your profile**: share team workflows through a repo `spec.yaml`, or keep your own global toolkit in `~/.aistack/spec.yaml`.
- **Sync once, target many AI clients**: generate the right files for Cursor, GitHub Copilot, and Claude.
- **See exactly what is installed**: Modules and Outputs views separate **Project** and **Profile** scope, so you know where each workflow lives.
- **Use the same engine as the CLI**: no global CLI install required, but the extension stays compatible with terminal and CI workflows.

## Project vs Profile

- **Add to project** writes to the open repo's `spec.yaml`; sync installs into `.cursor/`, `.github/`, `.claude/` **inside the repo** so workflows can be shared through git.
- **Add to profile** writes to `~/.aistack/spec.yaml`; sync installs into `~/.cursor`, `~/.copilot`, `~/.claude` so your personal toolkit is available **across every project** on this machine.

## What You Get

- **Modules** tree: installed modules grouped by **Project** and **Profile**
- **Catalog** webview: search, preview, and install workflows with clear scope-aware buttons
- **Outputs** tree: generated files for project and profile specs
- **Commands**: Initialize, Sync, Doctor, Search/Add, Switch Client
- **Settings**: `aiStackKit.clientType`, `aiStackKit.githubToken`, `aiStackKit.dryRun`, `aiStackKit.autoSyncOnSave`

## Quick start

1. Open a project folder.
2. Run **AI Stack Kit: Initialize Workspace** from the Command Palette.
3. Browse **Catalog** and choose **Add to project** or **Add to profile**, or run **Search Catalog...**.
4. Run **Sync** from the status bar (**$(sync) AI Stack**) to apply project and profile specs.

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
