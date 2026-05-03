# AI Stack Kit

**Install AI skills, subagents, and hooks like npm packages — across Cursor, Claude, and Copilot.**

A CLI to **discover, install, and apply AI capabilities** from GitHub, npm, and registries into your IDE—using a simple declarative spec.

> Think: npm for AI skills + Terraform for setup + kubectl for CLI UX

---

## Why this exists

AI skills are scattered across GitHub repos, npm packages, and community lists.

There’s no single way to:
- discover them
- install them
- keep them in sync across IDEs

**AI Stack Kit solves this with:**
- `sources.config.yaml` → where to fetch from  
- `spec.yaml` → what you use  
- CLI → resolves, installs, and applies everything

**Hosted discovery stays fresh:** the **[Skill browser](https://deb-adarsh.github.io/ai-stack-kit/)** isn’t a frozen index — it **rebuilds its catalog from upstream GitHub/npm trees** listed in the repo’s shared **`templates/sources.config.yaml`** whenever **`main`** changes and on a **weekly** cadence, so new skills in those sources show up without hand-maintaining a registry file. Your own project still uses **local** **`sources.config.yaml`** + **`aistack catalog refresh`** to merge names into **`spec.yaml`** (see **[Skill browser](#skill-browser-github-pages)** below).

Stop copy-pasting AI prompts between repos. Install them like packages.

---

## ⚡ 10-second demo

### Install the CLI

Easiest install from the **npm registry** (no GitHub token): **[npm package `ai-stack-kit`](https://www.npmjs.com/package/ai-stack-kit)**

| Registry | Install command |
|----------|-------------------|
| **npm registry** ([npmjs.com](https://www.npmjs.com/package/ai-stack-kit)) | `npm install -g ai-stack-kit` |
| **GitHub registry** ([GitHub Packages](https://docs.github.com/packages/learn-github-packages/introduction-to-github-packages), PAT — [`@deb-adarsh`](https://github.com/deb-adarsh)) | `npm install -g @deb-adarsh/ai-stack-kit` — see **[GitHub Packages](#github-packages)** below |

The CLI is **one build**, published as the **unscoped** package **`ai-stack-kit`** on the **npm registry** and as **`@deb-adarsh/ai-stack-kit`** on the **GitHub registry**. **`aistack`** / **`ai-stack`** / **`ai-stack-kit`** are the same — pick whichever install row matches where you pull packages from.

### Try it

```bash
npm install -g ai-stack-kit

aistack init
aistack search react
aistack skill add react-ui-expert   # or: aistack add react-ui-expert
aistack sync
```

---

## The workflow

search → add → sync

**One habit loop:** **`search`** → **`add`** (or **`catalog refresh`** to merge new upstream names safely into **`modules:`**) → **`sync`**—and your IDE picks up files from the **adapter** you chose (**Cursor**, **Copilot**, **Claude**, …). **`aistack`** / **`ai-stack`** / **`npx ai-stack-kit`**, or **`npx @deb-adarsh/ai-stack-kit`** (GitHub registry + `.npmrc`) — same CLI behavior.

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

Install with **`npm install -g ai-stack-kit`** (**npm registry**) or **`npm install -g @deb-adarsh/ai-stack-kit`** (**GitHub registry** — see **[GitHub Packages](#github-packages)**), or **`npm link`** from a clone — see **⚡ 10-second demo**.

```bash
# Install (examples — pick one)
# npm install -g ai-stack-kit                   # npm registry (unscoped)
# npm install -g @deb-adarsh/ai-stack-kit         # GitHub registry (+ ~/.npmrc)

# Initialize a new project (creates spec.yaml + default sources.config.yaml when missing)
aistack init

# Edit spec.yaml to add skills / agents / hooks
vim spec.yaml

# Install and apply
aistack sync
```

### GitHub Packages

GitHub’s npm registry (**`npm.pkg.github.com`**) expects authentication even for public packages. Use a PAT with **`read:packages`** (classic) or fine‑grained **Packages** read.

```ini
@deb-adarsh:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT
```

Then **`npm install -g @deb-adarsh/ai-stack-kit`**. **npm registry** installs (**`ai-stack-kit`**, unscoped) need **no** `.npmrc` for public packages.

Fresh **`init`** drops a **`sources.config.yaml`** next to `spec.yaml` with curated GitHub catalogs ([Copilot awesome-copilot](https://github.com/github/awesome-copilot), [Anthropic skills](https://github.com/anthropics/skills/tree/main/skills), [Composio awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills), [Antigravity bundle](https://github.com/sickn33/antigravity-awesome-skills)). Override or trim sources anytime.

**`init` client hint (optional):** the CLI peeks under your home directory only to **pre-select** the client list — **`sync` always follows `spec.yaml` → `client.type`**. Order of detection: **`~/.cursor`** → Cursor; **`~/.claude`** → Claude; **`~/.copilot`** or **`~/.vscode`** → GitHub Copilot (`copilot`); then IntelliJ paths. You can override in the prompt.

Skill packs from those trees are mostly **portable**: the same folder layout works across **Cursor**, **Copilot**, and **Claude** outputs — `client.type` in `spec.yaml` picks where files land. For a large curated index that is **README-only** (not a tree the CLI can crawl), see [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills).

### Skill browser (GitHub Pages)

Browse and filter the default catalogs; copy-paste commands use **`npx github:deb-adarsh/ai-stack-kit`** (no GitHub Packages PAT):

**[https://deb-adarsh.github.io/ai-stack-kit/](https://deb-adarsh.github.io/ai-stack-kit/)**

The UI reflects **`templates/sources.config.yaml`**: each deploy **re-queries those upstream skill trees** (GitHub Contents API / npm layouts), regenerates **`catalog.json`**, and publishes — so the demo tracks **upstream repos**, not a manually edited skill list. Your project’s **`sources.config.yaml`** and cache stay **separate**; use **`aistack catalog refresh`** locally to pull newly discovered IDs into **`spec.yaml`**. To propose another **public** upstream for the shared template, see **[CONTRIBUTING.md](./CONTRIBUTING.md)**.

---

## Example `spec.yaml`

AI Stack Kit reads **`client.type`** to decide which **client adapter** runs at apply time. **Built-in adapters:** **`cursor`**, **`copilot`**, **`claude`**. Use **`copilot`** for VS Code + GitHub Copilot outputs. Other **`client.type`** values only work with a custom adapter.

You normally declare **one** primary client per project; change **`type`** when you target a different editor or assistant surface.

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

## Who is this for?

- Developers using AI tools like Cursor, Claude, or Copilot
- Teams that want consistent AI setups across projects
- Builders creating reusable AI skills, agents, or workflows

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
# Optional --install-scope: user → client.installScope: user (~/.cursor, ~/.copilot, ~/.claude);
#   project → remove installScope (repo-local trees). Omit → leave spec unchanged (resolver treats unset as project).
aistack skill search <query>    # Search skills only
aistack skill add [name] [--install-scope project|user]
aistack skill info <name>       # Skill metadata
aistack subagent search <query> # Search subagents only
aistack subagent add [name] [--install-scope project|user]
aistack subagent info <name>    # Subagent metadata
aistack hook search <query>     # Search hooks only
aistack hook add [name] [--install-scope project|user]       # Add a hook to spec.yaml
aistack hook info <name>       # Hook metadata

# Modification (legacy aliases — same spec.yaml rows as typed add)
aistack add [name] [--install-scope project|user]   # Legacy (--type skill|subagent|hook)
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

- 📖 Documentation: see `/ARCHITECTURE.md` and `/QUICK_REFERENCE.md` in this repo
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
