# AI Stack Kit

[![npm](https://img.shields.io/npm/v/ai-stack-kit)](https://www.npmjs.com/package/ai-stack-kit)
[![VS Code extension](https://img.shields.io/badge/VS%20Code-Install%20from%20Marketplace-007ACC?style=flat&logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=deb-adarsh.ai-stack-kit)
[![Cursor extension](https://img.shields.io/badge/Cursor-Install%20from%20Open%20VSX-000000?style=flat&logo=cursor&logoColor=white)](https://open-vsx.org/extension/deb-adarsh/ai-stack-kit)
[![license](https://img.shields.io/github/license/deb-adarsh/ai-stack-kit)](https://github.com/deb-adarsh/ai-stack-kit/blob/main/LICENSE)
[![Skill browser](https://img.shields.io/badge/skill%20browser-live-informational)](https://deb-adarsh.github.io/ai-stack-kit/)

**Install AI skills, subagents, and hooks like npm packages - across Cursor, Claude, and Copilot.**

Stop copy-pasting AI workflows between repos. Install them like packages.

Not a fan of the CLI? Install the IDE extension — same `spec.yaml` workflow, no global install required:

- **VS Code** → [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=deb-adarsh.ai-stack-kit)
- **Cursor / VSCodium** → [Open VSX Registry](https://open-vsx.org/extension/deb-adarsh/ai-stack-kit) (search **"AI Stack Kit"** in the Extensions panel)

A CLI to **discover, install, apply and sync reusable AI capabilities** from GitHub, npm, and registries - using a simple declarative spec.

> Think: npm (distribution) + Terraform (setup) for AI dev environments

### Install options

| Method | Command |
|--------|---------|
| **npm registry** (public) | `npm install -g ai-stack-kit` |
| **GitHub Packages** | `npm install -g @deb-adarsh/ai-stack-kit` (requires [`.npmrc` auth](./docs/CLI_GUIDE.md#github-packages)) |
| **No global install** | `npx github:deb-adarsh/ai-stack-kit <command>` (same as the [Skill browser](https://deb-adarsh.github.io/ai-stack-kit/)) |
| **VS Code extension** | [Install from Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=deb-adarsh.ai-stack-kit) |
| **Cursor / VSCodium extension** | [Install from Open VSX](https://open-vsx.org/extension/deb-adarsh/ai-stack-kit) — or search **"AI Stack Kit"** in Cursor's Extensions panel |

### VS Code / Cursor extension

Same `spec.yaml` workflow as the CLI, no global install required.

- **VS Code** → [Install from the Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=deb-adarsh.ai-stack-kit)
- **Cursor** → [Install from Open VSX](https://open-vsx.org/extension/deb-adarsh/ai-stack-kit) (or search **"AI Stack Kit"** in the Extensions panel — Cursor uses the Open VSX registry, not the Visual Studio Marketplace)

- **Activity Bar** → **Modules**, **Catalog**, **Outputs**
- Commands: **Initialize**, **Sync**, **Doctor**, **Search/Add**, **Switch Client**
- Settings: `aiStackKit.clientType`, `aiStackKit.githubToken`, `aiStackKit.dryRun`, `aiStackKit.autoSyncOnSave`

See **[Extension guide](./docs/EXTENSION_GUIDE.md)** for workflows.

---

## 🔄 Keeps your AI stack in sync

AI Stack Kit doesn’t just install modules — it stays aligned with the open-source ecosystem.

- Skill browser auto-rebuilt from upstream sources  
- `aistack catalog refresh` pulls newly discovered modules into your spec  
- No manual tracking of repos  

Your AI stack evolves as open-source evolves.

---

## ⚡️ 10-second demo

```bash
npm install -g ai-stack-kit

aistack init
aistack search react
aistack add react-ui-expert
aistack sync
```

Your AI capabilities are now installed and configured in your IDE.

---

## What happens after `aistack sync`

- Skills are installed into your project or user scope  
- Subagents are generated and configured per client  
- Prompts are derived automatically from the same source  
- Hooks run as part of lifecycle (if configured)  

Everything is generated from the same spec — no duplication.

---

## 🧠 Works out of the box

- Auto-detects your AI client (Cursor, Claude, Copilot)
- Installs and configures everything in the right place
- No manual wiring per tool

---

## Why this exists

AI capabilities are scattered across GitHub repos, npm packages, and community lists.

There’s no standard way to:
- discover them
- install them
- keep them in sync across tools

AI Stack Kit introduces a spec-driven approach:
- `sources.config.yaml` → where to fetch from  
- `spec.yaml` → what your project uses  
- CLI + adapters → resolve and apply across tools

---

## 🔁 The workflow

**search → add → sync**

1. **`aistack init`** — create `spec.yaml` + `sources.config.yaml` (auto-detects Cursor / Copilot / Claude)
2. **`aistack search <query>`** — discover modules from configured catalogs ([Skill browser](https://deb-adarsh.github.io/ai-stack-kit/) too)
3. **`aistack skill add <name>`** — append to `spec.yaml`
4. **`aistack sync`** — resolve, install, and write IDE outputs from one spec

Run **`aistack doctor`** to validate your setup. See **[USER_GUIDE.md](./USER_GUIDE.md)** for full workflows.

---

## Overview

AI Stack Kit lets you:

- 📦 **Assemble** AI capabilities (**skills**, **subagents**, and **hooks**) in **`spec.yaml`**—portable, versioned modules you can sync and apply as reusable intelligence.
- 🔄 **Pull** modules from **GitHub**, **npm**, registries, or **local** paths using **`sources.config.yaml`**.
- 🎯 **Apply** the same portable manifests through **client adapters** (**Cursor**, **Copilot** / VS Code settings, **Claude**, …)—output paths follow **`client.type`**, not copy-paste sprawl.
- 🔒 **Version** and lock dependencies like you would with package managers.
- 🚀 **Share** a single **`spec.yaml`** across machines and teammates.
- 🌐 **Browse** the **[Skill browser](https://deb-adarsh.github.io/ai-stack-kit/)** (listings **sync from upstream** via **`templates/sources.config.yaml`** — see **[Why this exists](#why-this-exists)**) and use **`catalog refresh`** to append new upstream names into **`modules:`** without rewriting your whole file.

---

## Quick Start

```bash
npm install -g ai-stack-kit
aistack init
aistack sync
```

**[User guides](./USER_GUIDE.md)** — **[CLI](./docs/CLI_GUIDE.md)** · **[Extension](./docs/EXTENSION_GUIDE.md)**

---

## Who is this for?

- Developers using AI tools like Cursor, Claude, or Copilot
- Teams that want consistent AI setups across projects
- Builders creating reusable AI skills, agents, or workflows

---

## Not for

- One-off prompt usage
- Simple ChatGPT workflows
- Non-technical users

AI Stack Kit is designed for teams and developers managing reusable AI capabilities.

---

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────┐
│              CLI Layer                  │
│  (init, install, apply, sync)           │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│           Core Engine                   │
│  (orchestration, resolution)            │
└──┬───────┬─────────┬──────────┬────────┘
   │       │         │          │
   ▼       ▼         ▼          ▼
┌─────┐ ┌─────┐ ┌─────┐ ┌─────────┐
│Src  │ │Reg  │ │Adp  │ │ Storage │
│     │ │     │ │     │ │         │
└─────┘ └─────┘ └─────┘ └─────────┘
```

### Key Interfaces

1. **SkillSource**: Fetch skills from GitHub, npm, registries, or local files
2. **RegistryProvider**: Query and publish to skill registries
3. **IDEAdapter**: Apply skills to different IDEs (Cursor, VSCode, etc.)

### Design Principles

- ✅ **Pluggable**: Easy to add new sources, registries, and IDEs
- ✅ **Loose Coupling**: Modules communicate via interfaces
- ✅ **Single Responsibility**: Each module has one clear purpose
- ✅ **Testable**: Clear boundaries enable mocking and isolation

---

## Project structure

Repository layout and module boundaries: **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## Key Features

### 1. Pluggable Sources
Fetch skills from multiple sources:
- **GitHub**: Public/private repos
- **npm**: npm packages
- **Registry**: Custom registries (like npm registry)
- **Local**: File system paths

### 2. Version Management
- Semantic versioning (^1.0.0, ~2.1.0, latest)
- Lock files for reproducibility
- Dependency resolution
- Conflict detection

### 3. IDE Adapters

`spec.yaml` → **`client.type`** (**cursor**, **copilot**, **claude**) plus optional **`client.installScope`**: **`project`** (default) writes under the repo; **`user`** writes under your home directory for global tooling.

**Skills** — each resolved skill becomes a folder with **`SKILL.md`** (and any bundled paths preserved). There is no separate filename convention beyond normal skill packaging.

| Scope | Cursor | Copilot | Claude |
|--------|--------|---------|--------|
| Personal / global (`installScope: user`) | `~/.cursor/skills/` | `~/.copilot/skills/` | `~/.claude/skills/` |
| Repo / project (default) | `.cursor/skills/` | `.github/skills/` | `.claude/skills/` |

**Subagents** — generated agent files:

| Scope | Cursor | Copilot | Claude |
|--------|--------|---------|--------|
| Personal / global | `~/.cursor/agents/*.md` | `~/.copilot/agents/*.agent.md` | `~/.claude/agents/*.md` |
| Repo / project | `.cursor/agents/*.md` | `.github/agents/*.agent.md` | `.claude/agents/*.md` |

The **`*.agent.md`** pattern (**basename**: `.`, `-`, `_`, `a-z`, `A-Z`, `0-9` only before the suffix) is **GitHub Copilot only**. Cursor and Claude emit ordinary **`*.md`** agents.

**Prompt sets — same payload as skills (no extra fetch)** — Prompt files are **not** downloaded on their own. After each skill is resolved and fetched once, the **normalizer** derives prompts from that same in-memory payload (e.g. **`SKILL.md`** → instruction prompt; **`skill.json` / manifest `description`** → optional short system summary when present). **`aistack sync`** / **`apply`** then emits those files next to the skill trees and agents; agents carry **`promptIds`** wired by each adapter.

| Scope | Cursor | Copilot | Claude |
|--------|--------|---------|--------|
| Repo / project (default) | `.cursor/prompts/*.md` | **`aistack.copilot.promptSnippets`** in **project** `.vscode/settings.json` (id → body) | `.claude/prompts/*.md`, `.claude/system-bundle.aistack.md`, `.claude/README.aistack.md` |
| Global (`installScope: user`) | `~/.cursor/prompts/*.md` | same **`promptSnippets`** merge at **project** root (tree outputs still target **`~/.copilot/`**) | `~/.claude/prompts/*.md` (+ Claude bundle/readme under **`~/.claude/`**) |

**Copilot + VS Code**: `.vscode/settings.json` is still merged under the **`aistack`** key at the **project** root (e.g. **`promptSnippets`**), even when skill/agent trees target **`~/.copilot/`** via **`installScope: user`**.

### 4. Lifecycle Hooks
Run commands at different stages:
- `preInstall` / `postInstall`
- `preApply` / `postApply`
- `preSync` / `postSync`

### 5. Caching
- Content-addressable cache (like Git)
- Checksum verification
- Offline mode support

### 6. Skill browser & catalog refresh
- **Hosted UI**: filters and copy-paste CLI commands ([live demo](https://deb-adarsh.github.io/ai-stack-kit/)).
- **`aistack catalog refresh`**: compare configured catalogs with `spec.yaml` and **append** missing modules under `modules:` using a YAML-safe merge (new rows default to **`enabled: false`**; backs up `spec.yaml` first).

---

## Common commands

```bash
aistack init
aistack validate
export GITHUB_TOKEN=ghp_…   # recommended when searching GitHub-backed catalogs
aistack search <query>
aistack skill add [name]   # or: aistack add [name]
aistack catalog refresh --write
aistack sync
```

For the **full command list** — **`skill` / `subagent` / `hook`**, **`catalog refresh`** flags, **`install` / `apply`**, registry, and maintenance — see **[CLI guide](./docs/CLI_GUIDE.md#command-reference)**.

---

## Documentation

### 📚 Architecture

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Single architecture reference — diagrams, dependency rules, **actual** repository layout, interface shapes, pipeline flows, configuration examples, extension points, CLI reference, and ops concerns (performance, security, errors).

- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: How to contribute—including extending the **default catalog** (`templates/sources.config.yaml`) for the CLI and Skill browser.

- **[USER_GUIDE.md](./USER_GUIDE.md)**: Hub — CLI and extension guides
- **[CLI guide](./docs/CLI_GUIDE.md)**: Install, commands, env vars, troubleshooting
- **[Extension guide](./docs/EXTENSION_GUIDE.md)**: VS Code / Cursor sidebar workflows
- **[VS Code extension (Marketplace)](https://marketplace.visualstudio.com/items?itemName=deb-adarsh.ai-stack-kit)**: Install the sidebar UI

### 📝 Configuration

- **[templates/spec.yaml](./templates/spec.yaml)**: Template spec file
- **[templates/sources.config.yaml](./templates/sources.config.yaml)**: Default catalog sources

---

## Development

Build from source, run tests, extend sources/adapters, or publish the extension: **[CONTRIBUTING.md](./CONTRIBUTING.md)**.

---

## Comparison to Similar Tools

| Feature | AI Stack Kit | npm | Terraform | kubectl |
|---------|-------------|-----|-----------|---------|
| Declarative Config | ✅ | ❌ | ✅ | ✅ |
| Version Locking | ✅ | ✅ | ✅ | ❌ |
| Multiple Sources | ✅ | ⚠️ | ⚠️ | ❌ |
| IDE Agnostic | ✅ | ❌ | N/A | N/A |
| Dependency Resolution | ✅ | ✅ | ✅ | ❌ |
| Lifecycle Hooks | ✅ | ✅ | ✅ | ❌ |

---

## Roadmap

Snapshot of **what’s in the repo today** and **what might come next**—adjust as the project evolves.

| Area | Status |
|------|--------|
| **CLI** | Shipped: `init`, `search`, typed `skill` / `subagent` / `hook`, `add`, `sync`, `catalog refresh`, validation, etc. Some commands are still **placeholders** (e.g. `update`, `clean`, registry `login` / `publish`). |
| **`spec.yaml`** | Load + **Zod validation**, apply pipeline, modules merge (`skills` + `modules`). |
| **Sources** | **GitHub** fetch/install + **npm** packages; **dynamic catalogs** from `sources.config.yaml` (GitHub tree + npm tree providers). |
| **Discovery** | Composite registry, hybrid search, **`catalog refresh`** for additive spec merges. |
| **IDE outputs** | **Cursor**, **Copilot** (VS Code settings path), **Claude** client adapters; **[VS Code extension](https://marketplace.visualstudio.com/items?itemName=deb-adarsh.ai-stack-kit)** for in-editor sync and catalog browse. |
| **Skill browser** | **Static web app** + `catalog.json` build + **GitHub Pages** deploy (weekly cron + pushes). |
| **Hosted registry product** | No dedicated **public registry server** or npm-like **publish** flow yet—discovery is **aggregate-from-upstreams** plus local spec. |

**Possible next steps** (community-driven, not commitments): richer VS Code story, real registry/auth, watch mode, polish placeholders, tests/CI depth—track via **Issues** and **[CONTRIBUTING.md](./CONTRIBUTING.md)**.

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

## License

Licensed under the **Apache License 2.0**. See [LICENSE](./LICENSE).

---

## Support

- 📖 Documentation: **[User guides](./USER_GUIDE.md)** · **[ARCHITECTURE.md](./ARCHITECTURE.md)**
- 🧩 VS Code extension: **[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=deb-adarsh.ai-stack-kit)** (`deb-adarsh.ai-stack-kit`)
- 🐛 Issues: [GitHub Issues](https://github.com/deb-adarsh/ai-stack-kit/issues)
- ✉️ Maintainer: [debadarsh7@gmail.com](mailto:debadarsh7@gmail.com)

---

## Acknowledgments

Inspired by:
- **npm**: Registry abstraction and versioning
- **Terraform**: Declarative infrastructure
- **kubectl**: CLI user experience
- **Cursor**: IDE extensibility

Built with ❤️ for developers who want portable, reproducible IDE configurations.
