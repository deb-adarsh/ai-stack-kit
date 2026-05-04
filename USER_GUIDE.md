# AI Stack Kit — User guide

Hands-on install, **`spec.yaml`** patterns, the full command surface, and troubleshooting. For repository layout, diagrams, and extension APIs, see **[ARCHITECTURE.md](./ARCHITECTURE.md)** and **[EXTENSIONS.md](./EXTENSIONS.md)**. High-level positioning stays in the root **[README.md](./README.md)**.

---

## Quick Start

Install with **`npm install -g ai-stack-kit`** (**npm registry**) or **`npm install -g @deb-adarsh/ai-stack-kit`** (**GitHub registry** — see **[GitHub Packages](#github-packages)** below), or **`npm link`** from a clone.

```bash
# Install (examples — pick one)
# npm install -g ai-stack-kit                   # npm registry (public)
# npm install -g @deb-adarsh/ai-stack-kit       # GitHub registry (+ ~/.npmrc)

export GITHUB_TOKEN=ghp_…   # optional: higher GitHub REST limits for `search` / listings (fine-grained: Contents read on public repos)

# Initialize (spec.yaml + sources.config.yaml; appends a managed `.gitignore` block — same block is ensured again on `sync` / `apply` / `install` if missing)
aistack init

# Edit spec.yaml to add skills / agents / hooks
vim spec.yaml

# Install and apply
aistack sync
```

### Upgrade the CLI

**`npm install -g …@latest`** only updates the **global CLI** (the `aistack` / `ai-stack` binaries). It does **not** rewrite **`spec.yaml`**, **`sources.config.yaml`**, your IDE skill folders, or caches — those stay until **you** change them or run commands that modify them.

```bash
npm install -g ai-stack-kit@latest
# GitHub registry: npm install -g @deb-adarsh/ai-stack-kit@latest
```

Use **`aistack --version`** to confirm. Open projects keep working; run **`aistack sync`** when you want outputs regenerated under the new CLI.

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

Catalog discovery uses **`sources.config.yaml`** in the project root (`aistack init` seeds a default — see [Quick Start](#quick-start)). **`hooks`** at the bottom are **lifecycle shell steps** (pre/post install/apply), not the same thing as **`moduleType: hook`** AI modules in `modules:`.

**`aistack search`** calls the GitHub REST API for each configured GitHub source (same listing traffic as catalog hydration). Without **`GITHUB_TOKEN`**, shared egress IPs often hit **rate limits** (403). Export a PAT with **contents read** on those repos for higher quotas; a failing source is skipped so results still merge from npm catalogs, other GitHub mirrors, disk cache, and **offline** hints.

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

## Core concepts

### 1. Skills
Reusable IDE configurations (like Cursor skills, rules, hooks) packaged and distributed.

### 2. Sources
Where skills come from: GitHub, npm, custom registries, or local files.

### 3. Registries
Centralized repositories for discovering and fetching skills (like npm registry).

### 4. Adapters
IDE-specific implementations that apply skills to Cursor, VS Code / Copilot, Claude, etc.

### 5. Spec file (`spec.yaml`)
Declarative configuration defining which skills to install and how.

### 6. Lock file (`.aistack/lock.yaml`)
Optional reproducibility artifact with resolved versions (similar spirit to `package-lock.json`).

---

## Command reference

**`install`**, **`apply`**, and **`sync`** read **`spec.yaml`** (`skills:` + `modules:`); they do **not** take a skill name on the CLI. Add modules with **`skill add`**, **`add`**, or by editing **`spec.yaml`**, then run **`sync`**.

For **`search`** against GitHub-backed catalogs, export **`GITHUB_TOKEN`** (see [Environment variables](#environment-variables)).

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

## Skill reference formats

| Format | Example | Description |
|--------|---------|-------------|
| GitHub | `github:official` | From configured GitHub source |
| npm | `npm:npm-skills` | From configured npm source |
| Registry | `registry:company` | From custom registry |
| Local | `local:workspace` | From local filesystem |

---

## Version specifiers

| Specifier | Meaning | Example |
|-----------|---------|---------|
| `1.2.3` | Exact version | `1.2.3` |
| `^1.2.3` | Compatible (minor) | `1.2.3` to `<2.0.0` |
| `~1.2.3` | Patch updates | `1.2.3` to `<1.3.0` |
| `>=1.2.3` | Minimum version | `1.2.3` and above |
| `latest` | Latest version | Most recent |
| `*` | Any version | Latest stable |

---

## Environment variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `AISTACK_TOKEN` | Default registry token | `export AISTACK_TOKEN=abc123` |
| `AISTACK_CACHE_DIR` | Override cache dir | `~/.cache/aistack` |
| `AISTACK_LOG_LEVEL` | Log verbosity | `debug`, `info`, `warn`, `error` |
| `GITHUB_TOKEN` | Higher GitHub **REST** limits for **`aistack search`** / catalog listing + **private** skill repos | `export GITHUB_TOKEN=ghp_…` (fine-grained: **Contents** read on public repos) |

---

## Dependency resolution

```
spec.yaml
    │
    ├─ Skill A (^1.0.0)
    │   └─ Skill C (^2.0.0)
    │
    └─ Skill B (~2.1.0)
        └─ Skill C (^2.1.0)

Resolution:
  - Skill A: 1.2.3 (latest ^1.x)
  - Skill B: 2.1.5 (latest ~2.1.x)
  - Skill C: 2.1.8 (satisfies both ^2.0.0 and ^2.1.0)
```

---

## File locations

| File/Directory | Purpose | Location |
|----------------|---------|----------|
| `spec.yaml` | Project configuration | Project root |
| `.aistack/lock.yaml` | Lock file | Project root |
| `~/.aistack/cache/` | Downloaded skills | User home |
| `~/.aistack/config.yaml` | Global config | User home |
| `~/.cursor/skills/` | Installed skills (Cursor) | User home |

---

## Error codes

| Code | Category | Description |
|------|----------|-------------|
| 0 | Success | Command completed successfully |
| 1 | User Error | Invalid spec, missing files |
| 2 | Network Error | Failed downloads, timeouts |
| 3 | System Error | Permission denied, disk full |
| 4 | IDE Error | IDE not found, version mismatch |
| 5 | Registry Error | Registry unavailable |
| 6 | Conflict Error | Dependency conflicts |

---

## Workflow patterns

### Pattern 1: Fresh install
```bash
git clone repo && cd repo
aistack sync
```

### Pattern 2: Add new skill
```bash
export GITHUB_TOKEN=ghp_…   # recommended for search against GitHub catalogs
aistack search figma
aistack add github:official/figma-agent   # or: aistack skill add …
aistack sync
```

### Pattern 3: Update skills
```bash
aistack update
aistack update canvas
aistack status
```

### Pattern 4: Share configuration
```bash
git add spec.yaml .aistack/lock.yaml
git commit -m "Add aistack configuration"
git push
```

---

## Best practices

1. **Lock file** — Commit `.aistack/lock.yaml` when your team wants reproducible resolves.
2. **Version constraints** — Use `^` for libraries (minor updates), exact versions for critical rows.
3. **Secrets** — Use environment variables for tokens; never commit credentials.
4. **Local development** — Use `local:` sources for WIP; switch to `github:` / `registry:` for shared setups.
5. **Hooks** — Keep lifecycle hooks fast (notifications, not heavy jobs).
6. **Validation** — Run **`aistack validate`** before committing spec changes.
7. **Cache** — Prefer **`aistack clean`** when installs behave oddly.

---

## Troubleshooting

### Skills not applying
```bash
aistack status --verbose
aistack validate
aistack apply --force
```

### Network errors
```bash
aistack install --offline
AISTACK_TIMEOUT=60000 aistack install
aistack clean --cache
aistack install
```

### Dependency conflicts
```bash
aistack list --tree
# Pin versions in spec.yaml when needed
```

---

Back to **[README.md](./README.md)** for product overview, roadmap, and repo map.
