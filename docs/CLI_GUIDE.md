# AI Stack Kit — CLI guide

Use the **`aistack`** terminal CLI to initialize projects, search catalogs, edit **`spec.yaml`**, and sync skills to **Cursor**, **GitHub Copilot**, or **Claude**.

Prefer an IDE sidebar? See **[Extension guide](./EXTENSION_GUIDE.md)**. For shared concepts (`spec.yaml`, sources, skill browser), start at **[User guides](../USER_GUIDE.md)**.

---

## Install

```bash
npm install -g ai-stack-kit
# GitHub Packages: npm install -g @deb-adarsh/ai-stack-kit  (+ ~/.npmrc — see below)
```

**No global install:** `npx github:deb-adarsh/ai-stack-kit <command>` (same commands as the [Skill browser](https://deb-adarsh.github.io/ai-stack-kit/)).

### Upgrade the CLI

`npm install -g …@latest` updates only the **binaries**. It does not change **`spec.yaml`**, caches, or IDE output folders until you run **`aistack sync`**.

```bash
npm install -g ai-stack-kit@latest
aistack --version
```

### GitHub Packages

GitHub’s npm registry expects authentication even for public packages. Use a PAT with **`read:packages`**.

```ini
@deb-adarsh:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT
```

Then `npm install -g @deb-adarsh/ai-stack-kit`. The public **`ai-stack-kit`** package on npm needs no `.npmrc`.

---

## Quick start

```bash
export GITHUB_TOKEN=ghp_…   # optional: higher GitHub REST limits for search

aistack init
aistack search react
aistack skill add <name>
aistack sync
```

Fresh **`init`** writes **`spec.yaml`** and **`sources.config.yaml`** (curated GitHub/npm catalogs). **`init` client hint** inspects your home directory (`~/.cursor`, `~/.vscode`, `~/.copilot`, `~/.claude`) — **`sync` always follows `spec.yaml` → `client.type`**.

### Skill browser (web)

Browse upstream catalogs and copy CLI commands: **[deb-adarsh.github.io/ai-stack-kit](https://deb-adarsh.github.io/ai-stack-kit/)**

Use **`aistack catalog refresh --write`** locally to append newly discovered module IDs into **`spec.yaml`**.

---

## Example `spec.yaml`

Built-in **`client.type`** values: **`cursor`**, **`copilot`**, **`claude`**. Use **`copilot`** for VS Code + GitHub Copilot output paths.

**`hooks`** at the bottom of the spec are **lifecycle shell steps**, not **`moduleType: hook`** AI modules in **`modules:`**.

Without **`GITHUB_TOKEN`**, **`aistack search`** against GitHub sources may hit rate limits (403); other sources and offline hints still merge.

```yaml
version: "1.0"

project:
  name: my-ai-setup
  description: Declarative skills and agents for your toolchain

client:
  type: cursor
  features:
    - skills
    - hooks

settings:
  cacheDir: ~/.aistack/cache
  lockFile: .aistack/lock.yaml

skills: []

modules:
  - name: example-skill
    moduleType: skill
    version: latest
    source: github
    sourceConfig:
      owner: github
      repo: awesome-copilot
      path: skills/example

hooks:
  postApply:
    - echo "AI Stack Kit apply finished."
```

Full template: **[templates/spec.yaml](../templates/spec.yaml)**.

---

## Command reference

**`install`**, **`apply`**, and **`sync`** read **`spec.yaml`**; add modules with **`skill add`** / **`add`**, then **`sync`**.

```bash
# Project
aistack init
aistack validate
aistack status
aistack doctor

# Resolve → install → IDE
aistack install
aistack apply
aistack sync              # install + apply (--dry-run, -v, --offline, --force)

# Discovery
aistack search <query>
aistack info <name>
aistack list

# Catalog → spec
aistack catalog refresh
aistack catalog refresh --write
aistack catalog refresh --write -y --max 50
aistack catalog refresh --refresh-sources

# Typed: skill | subagent | hook
aistack skill search <query>
aistack skill add [name] [--install-scope project|user]
aistack subagent search <query>
aistack subagent add [name]
aistack hook search <query>
aistack hook add [name]

aistack add [name]          # legacy alias
aistack remove <name>

# Maintenance
aistack clean
```

See **[CLI UX flows](./CLI_UX_FLOWS.md)** for target interaction details.

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | GitHub REST limits for **`search`** / catalog listing; private repos |
| `AISTACK_TOKEN` | Registry token (when using registry commands) |
| `AISTACK_CACHE_DIR` | Override cache directory |
| `AISTACK_LOG_LEVEL` | `debug`, `info`, `warn`, `error` |

---

## Workflow patterns

```bash
# Fresh clone
aistack sync

# Add a module
aistack search figma
aistack skill add <name>
aistack sync

# Share with team
git add spec.yaml .aistack/lock.yaml
git commit -m "Add AI stack spec"
```

---

## Troubleshooting

| Problem | Try |
|---------|-----|
| Skills not applying | `aistack doctor`, `aistack validate`, `aistack sync -v` |
| GitHub 403 on search | `export GITHUB_TOKEN=…` |
| Stale installs | `aistack clean` then `aistack sync` |
| Spec errors | `aistack validate` |

---

## See also

- **[Extension guide](./EXTENSION_GUIDE.md)** — VS Code / Cursor sidebar
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** — pipeline and adapters
- **[README.md](../README.md)** — product overview
