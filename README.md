# AI Stack Kit

**Declare your IDE skills once—pull from anywhere, apply everywhere.**

A CLI and open discovery layer for skills, subagents, and hooks across **GitHub trees**, **npm**, registries, and local paths—without juggling a bookmark folder full of unrelated repos.

> Think: **npm** for IDE configurations + **Terraform** for declarative setup + **kubectl** for CLI UX

---

## Why this exists

**Skills are everywhere; there’s still no “npm for IDE skills.”** Great packs live across vendor repos, community trees, and tarballs—too many sources to track by hand, and no single place where **discovery** and **your stack** meet.

**AI Stack Kit is the glue:** **`sources.config.yaml`** names the catalogs you trust, **`spec.yaml`** pins what you actually use, and the CLI **resolves, fetches, and applies** (with sane caching). The **[Skill browser](https://deb-adarsh.github.io/ai-stack-kit/)** is an **open, auto-rebuilt directory** over those upstreams—**weekly, Mondays 06:00 UTC**—so listings stay fresh **without** a hand-maintained index.

**Help grow the default catalog for everyone:** open a PR that extends **`templates/sources.config.yaml`** (see **[CONTRIBUTING.md](./CONTRIBUTING.md)**).

---

## The CLI: what you get

**One habit loop:** **`search`** → **`add`** (or **`catalog refresh`** to merge new upstream names safely into **`modules:`**) → **`sync`**—and your IDE picks up files from the **adapter** you chose (**Cursor**, **Copilot**, **Claude**, …). **`aistack`** / **`ai-stack`** / **`npx ai-stack-kit`** all speak the same idea: **declarative spec**, **package-manager muscle**, **no manual tarball archaeology**. Same portable skill folders; different output paths—**you write intent, the CLI does the plumbing.**

---

## Overview

AI Stack Kit lets you:

- 📦 **Assemble** **skills**, **subagents**, and **hooks** in **`spec.yaml`**—portable, versioned modules you can sync and apply as reusable intelligence.
- 🔄 **Pull** modules from **GitHub**, **npm**, registries, or **local** paths using **`sources.config.yaml`**.
- 🎯 **Apply** the same portable manifests through **client adapters** (**Cursor**, **Copilot** / VS Code settings, **Claude**, …)—output paths follow **`client.type`**, not copy-paste sprawl.
- 🔒 **Version** and lock dependencies like you would with package managers.
- 🚀 **Share** a single **`spec.yaml`** across machines and teammates.
- 🌐 **Browse** curated default catalogs in the **[Skill browser](https://deb-adarsh.github.io/ai-stack-kit/)** and use **`catalog refresh`** to append new upstream listings into **`modules:`** without rewriting your whole file.

**Contributors welcome.** The shared **default catalog** is **[`templates/sources.config.yaml`](./templates/sources.config.yaml)**—the same file **`aistack init`** copies for new projects and that powers the hosted Skill browser. Open a PR to add **public, well-maintained** skill trees (GitHub or npm), or improve code and docs. See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for how to add sources and validate locally.

---

## Quick Start

After `npm install -g ai-stack-kit`, run **`aistack`** or **`ai-stack`** (both invoke the same CLI).

```bash
# Install AI Stack Kit (CLI commands: aistack or ai-stack)
npm install -g ai-stack-kit

# Initialize a new project (creates spec.yaml + default sources.config.yaml when missing)
aistack init

# Edit spec.yaml to add skills / agents / hooks
vim spec.yaml

# Install and apply
aistack sync
```

Fresh **`init`** drops a **`sources.config.yaml`** next to `spec.yaml` with curated GitHub catalogs ([Copilot awesome-copilot](https://github.com/github/awesome-copilot), [Anthropic skills](https://github.com/anthropics/skills/tree/main/skills), [Composio awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills), [Antigravity bundle](https://github.com/sickn33/antigravity-awesome-skills)). Override or trim sources anytime.

Skill packs from those trees are mostly **portable**: the same folder layout works across **Cursor**, **Copilot**, and **Claude** outputs — `client.type` in `spec.yaml` picks where files land. For a large curated index that is **README-only** (not a tree the CLI can crawl), see [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills).

### Skill browser (GitHub Pages)

Browse the default catalogs in the browser (search, ecosystem filters, copy **`npx ai-stack-kit`** lines):

**[https://deb-adarsh.github.io/ai-stack-kit/](https://deb-adarsh.github.io/ai-stack-kit/)**

The listing tracks **`templates/sources.config.yaml`** (the default catalog). Hosting rebuilds on **every push to `main`**, on-demand via Actions, and on a **weekly cron (Monday 06:00 UTC)** so listings stay in sync with those upstream sources—no hand-maintained index file. Your **local** project still uses its own **`sources.config.yaml`** and cache TTL; extend the shared baseline via **[CONTRIBUTING.md](./CONTRIBUTING.md)** (fork if you want a different Pages catalog).

---

## Example `spec.yaml`

AI Stack Kit reads **`client.type`** to decide which **client adapter** runs at apply time (`cursor`, `copilot`, `claude`, `vscode`, …). You normally declare **one** primary client per project; change `type` when you target a different editor or assistant surface.

Catalog discovery uses **`sources.config.yaml`** in the project root (`aistack init` seeds a default — see Quick Start). **`hooks`** at the bottom are **lifecycle shell steps** (pre/post install/apply), not the same thing as **`moduleType: hook`** AI modules in `modules:`.

```yaml
version: "1.0"

project:
  name: my-ai-setup
  description: Declarative skills and agents for your toolchain

# Pick the client that receives generated files (examples below — keep one active block).
client:
  type: cursor                    # also: copilot | claude | vscode | ...
  # installScope: project        # default — repo paths (.cursor/…, .github/…, .claude/…)
  # installScope: user          # global paths (~/.cursor/…, ~/.copilot/…, ~/.claude/…)
  features:
    - skills
    - hooks
  # adapter:
  #   mergeStrategy: merge

# Optional defaults (paths expand ~)
settings:
  cacheDir: ~/.aistack/cache
  lockFile: .aistack/lock.yaml

skills:
  - name: canvas
    version: ^2.0.0
    source: github
    sourceConfig:
      owner: your-org
      repo: skills
      path: canvas
      branch: main

  - name: figma-agent
    version: latest
    source: npm
    sourceConfig:
      package: "@your-scope/skills-bundle"
      path: skills # subdirectory inside the package (when applicable)

  - name: my-custom-skill
    source: local
    sourceConfig:
      localPath: ./skills/my-custom-skill

# Same row shape as skills; use moduleType for subagents / hook manifests.
modules:
  - name: code-reviewer
    moduleType: subagent
    version: latest
    source: github
    sourceConfig:
      owner: your-org
      repo: agents
      path: code-reviewer

# Lifecycle commands (optional), not AI hook modules
hooks:
  postApply:
    - echo "AI Stack Kit apply finished."
```

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
├── .github/workflows/
│   └── build-github.yml  # Build catalog + web → GitHub Pages (incl. weekly cron)
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
- **Hosted UI**: minimal skill browser with filters and copy-paste **`npx`** commands ([live demo](https://deb-adarsh.github.io/ai-stack-kit/)); rebuilt automatically when CI runs (including **weekly Monday 06:00 UTC**).
- **`aistack catalog refresh`**: compare configured catalogs with `spec.yaml` and **append** missing modules under `modules:` using a YAML-safe merge (new rows default to **`enabled: false`**; backs up `spec.yaml` first).

---

## Commands

```bash
# Project Management
aistack init                    # Initialize new project
aistack validate                # Validate spec.yaml
aistack status                  # Show installation status

# Resolve spec → install → IDE (all module kinds in spec.yaml)
aistack install                 # Fetch / install modules (skills, subagents, hooks, …)
aistack apply                   # Apply generated config to IDE
aistack sync                    # Install + apply
aistack update [name]           # Update modules (placeholder / bump in spec)

# Discovery (any kind — or use typed commands below)
aistack search <query>          # Search catalogs
aistack info <name>             # Show catalog metadata for a module
aistack list                    # List modules declared in spec.yaml

# Catalog vs spec (additive YAML merge — preserves comments better than full rewrite)
aistack catalog refresh              # List catalog modules not yet in spec.yaml
aistack catalog refresh --write      # Interactive: append selected rows under modules:
aistack catalog refresh --write -y --max 50   # Non-interactive batch (disabled by default)
aistack catalog refresh --refresh-sources       # Clear GitHub listing cache, then refresh

# Typed catalogs (preferred): skill | subagent | hook
aistack skill search <query>    # Search skills only
aistack skill add [name]       # Add a skill to spec.yaml
aistack skill info <name>       # Skill metadata
aistack subagent search <query> # Search subagents only
aistack subagent add [name]    # Add a subagent to spec.yaml
aistack subagent info <name>    # Subagent metadata
aistack hook search <query>     # Search hooks only
aistack hook add [name]        # Add a hook to spec.yaml
aistack hook info <name>       # Hook metadata

# Modification (legacy aliases — same spec.yaml rows as typed add)
aistack add [name]              # Add a module (optionally --type skill|subagent|hook)
aistack remove <name>           # Remove a module from spec.yaml

# Registry
aistack login                  # Login to registry
aistack publish                # Publish module

# Maintenance
aistack clean                  # Clean cache
```

---

## Documentation

### 📚 Architecture

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Single architecture reference — diagrams, dependency rules, **actual** repository layout, interface shapes, pipeline flows, configuration examples, extension points, CLI reference, and ops concerns (performance, security, errors).

- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: How to contribute—including extending the **default catalog** (`templates/sources.config.yaml`) for the CLI and Skill browser.

- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)**: Quick reference guide
  - Core concepts
  - Interface summary
  - Command cheat sheet
  - Configuration examples
  - Troubleshooting

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
git clone https://github.com/your-org/ai-stack-kit.git
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

### Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
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

- 📖 Documentation: see `/ARCHITECTURE.md` and `/QUICK_REFERENCE.md` in this repo
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/ai-stack-kit/issues)
- ✉️ Maintainer: [debadarsh7@gmail.com](mailto:debadarsh7@gmail.com)

---

## Acknowledgments

Inspired by:
- **npm**: Registry abstraction and versioning
- **Terraform**: Declarative infrastructure
- **kubectl**: CLI user experience
- **Cursor**: IDE extensibility

Built with ❤️ for developers who want portable, reproducible IDE configurations.
