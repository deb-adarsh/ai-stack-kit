# AI Stack Kit

[![npm](https://img.shields.io/npm/v/ai-stack-kit)](https://www.npmjs.com/package/ai-stack-kit)
[![license](https://img.shields.io/github/license/deb-adarsh/ai-stack-kit)](https://github.com/deb-adarsh/ai-stack-kit/blob/main/LICENSE)
[![Skill browser](https://img.shields.io/badge/skill%20browser-live-informational)](https://deb-adarsh.github.io/ai-stack-kit/)

**Install AI skills, subagents, and hooks like npm packages - across Cursor, Claude, and Copilot.**

Stop copy-pasting AI workflows between repos. Install them like packages.

A CLI to **discover, install, and apply reusable AI capabilities** from GitHub, npm, and registries — using a simple declarative spec.

> Think: npm (distribution) + Terraform (setup) for AI dev environments

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

---

## 🧠 Works out of the box

- Auto-detects your AI client (Cursor, Claude, Copilot)
- Applies configs to the correct locations
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

search → add → sync

### 1. Faster clarity (first 5 seconds)
- “install AI capabilities like npm packages” → instantly understandable  
- removes heavy phrasing early  

### 2. Your BEST feature is now prominent
- auto-sync is now **top section**, not buried  

### 3. UX strength is explicit
- auto-detection highlighted clearly  

### 4. Reduces cognitive load
- no long paragraphs upfront  
- tight, scannable sections  

### 5. Strong mental model
- spec → sync → generated outputs is crystal clear  

---

## Overview

AI Stack Kit lets you:

- 📦 **Assemble** **skills**, **subagents**, and **hooks** in **`spec.yaml`**—portable, versioned modules you can sync and apply as reusable intelligence.
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

**[USER_GUIDE.md](./USER_GUIDE.md)** — install (**npm** vs **GitHub Packages**), upgrading the CLI, **`GITHUB_TOKEN`** for **`search`**, Skill browser, **`sources.config.yaml`** defaults, annotated **`spec.yaml`**, full command list, env vars, workflows, troubleshooting.

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

## Project Structure

```
ai-stack-kit/
├── src/
│   ├── cli/              # CLI commands (including catalog refresh)
│   ├── pipeline/         # spec load, apply
│   ├── sources/          # GitHub, npm, registry, local
│   ├── registry/         # Dynamic catalogs from sources.config.yaml
│   ├── client-adapters/   # Cursor, Copilot, Claude outputs
│   └── types/
├── web/                  # Skill browser (Vite + React; static `dist/` for Pages)
├── scripts/
│   └── build-catalog.mjs # Builds web/public/catalog.json for the browser
├── templates/
│   ├── spec.yaml
│   └── sources.config.yaml  # Default catalogs (also used by CI for Pages)
├── .github/workflows/    # CI (e.g. Skill browser deploy)
├── config/
└── ...
```

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

For the **full command list** — **`skill` / `subagent` / `hook`**, **`catalog refresh`** flags, **`install` / `apply`**, registry, and maintenance — see **[Command reference](./USER_GUIDE.md#command-reference)** in **USER_GUIDE.md**.

---

## Documentation

### 📚 Architecture

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Single architecture reference — diagrams, dependency rules, **actual** repository layout, interface shapes, pipeline flows, configuration examples, extension points, CLI reference, and ops concerns (performance, security, errors).

- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: How to contribute—including extending the **default catalog** (`templates/sources.config.yaml`) for the CLI and Skill browser.

- **[USER_GUIDE.md](./USER_GUIDE.md)**: Install paths, **`spec.yaml`** example, full CLI reference, env vars, workflows, troubleshooting.

### 📝 Configuration

- **[templates/spec.yaml](./templates/spec.yaml)**: Template spec file
- **[config/schema.json](./config/schema.json)**: JSON schema for validation
- **[config/default.yaml](./config/default.yaml)**: Default configuration

### 🔧 Implementation

- **[src/types/](./src/types/)**: TypeScript type definitions
  - `skill.ts`: Skill types
  - `spec.ts`: Spec file types
  - `config.ts`: CLI config types
  - `registry.ts`: Registry types

- **[src/sources/base/](./src/sources/base/)**: SkillSource interface
- **[src/registry/base/](./src/registry/base/)**: RegistryProvider interface
- **[src/adapters/base/](./src/adapters/base/)**: IDEAdapter interface

---

## Development

### Prerequisites
- Node.js >= 18
- TypeScript >= 5.0

### Setup

```bash
# Clone repository
git clone https://github.com/deb-adarsh/ai-stack-kit.git
cd ai-stack-kit

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run CLI locally
npm link
aistack --help

# Skill browser: TS build + catalog JSON + Vite dev
npm run dev:web

# Static web/dist (+ catalog) for hosting / parity with CI
npm run build:web
```

---

## Extending AI Stack Kit

### Add a New Source (e.g., GitLab)

1. Create `src/sources/gitlab/gitlab-source.ts`
2. Implement `SkillSource` interface
3. Register in source factory
4. Add to schema: `config/schema.json`

**Example:**
```typescript
import { BaseSkillSource } from '../base/skill-source';

export class GitLabSource extends BaseSkillSource {
  constructor(name: string) {
    super(name, 'gitlab');
  }
  
  canHandle(ref: SkillReference): boolean {
    return ref.source.startsWith('gitlab:');
  }
  
  async resolve(ref: SkillReference): Promise<SkillMetadata> {
    // Fetch from GitLab API
  }
  
  // ... implement other methods
}
```

### Add a New IDE (e.g., IntelliJ)

1. Create `src/adapters/intellij/intellij-adapter.ts`
2. Implement `IDEAdapter` interface
3. Register in adapter factory
4. Add detection logic

**Example:**
```typescript
import { BaseIDEAdapter } from '../base/ide-adapter';

export class IntelliJAdapter extends BaseIDEAdapter {
  constructor() {
    super('intellij', ['skills', 'settings']);
  }
  
  async detect(): Promise<IDEDetectionResult> {
    // Detect IntelliJ installation
  }
  
  async applySkill(skill: SkillContent): Promise<ApplyResult> {
    // Transform and write to IntelliJ format
  }
  
  // ... implement other methods
}
```

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
| **IDE outputs** | **Cursor**, **Copilot** (VS Code settings path), **Claude** client adapters in the apply pipeline—not a full generic “VS Code extension marketplace” story. |
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

- 📖 Documentation: **[USER_GUIDE.md](./USER_GUIDE.md)** · **[ARCHITECTURE.md](./ARCHITECTURE.md)**
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
