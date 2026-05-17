# AI Stack Kit — User guides

AI Stack Kit is a **spec-driven** toolkit for installing and syncing **skills**, **subagents**, and **hooks** across **Cursor**, **GitHub Copilot**, and **Claude**. One **`spec.yaml`** per project; one sync pipeline — choose how you work:

| Guide | Best for |
|-------|----------|
| **[CLI guide](./docs/CLI_GUIDE.md)** | Terminal, CI/CD, scripts, `aistack catalog refresh`, automation |
| **[Extension guide](./docs/EXTENSION_GUIDE.md)** | VS Code / Cursor sidebar — Modules, Catalog, Sync without a global CLI |

Product overview and install matrix: **[README.md](./README.md)**. Architecture and APIs: **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## Shared concepts (both surfaces)

### Files in your project

| File | Role |
|------|------|
| **`spec.yaml`** | What modules you use and which **client** receives generated files |
| **`sources.config.yaml`** | Where to discover modules (GitHub trees, npm, etc.) |
| **`.aistack/`** | Cache, lock file, install artifacts |

Created by **`aistack init`** or **AI Stack Kit: Initialize Workspace**.

### Workflow

**search → add → sync**

1. Discover modules (CLI **`search`**, extension **Catalog**, or [Skill browser](https://deb-adarsh.github.io/ai-stack-kit/)).
2. Add rows to **`spec.yaml`**.
3. **Sync** — resolve sources, install, write IDE-specific outputs.

### Clients

| `client.type` | Typical outputs |
|---------------|-----------------|
| **`cursor`** | `.cursor/skills/`, etc. |
| **`copilot`** | `.github/skills/`, Copilot instructions |
| **`claude`** | Claude project / user skill paths |

### Skill browser (hosted)

**[https://deb-adarsh.github.io/ai-stack-kit/](https://deb-adarsh.github.io/ai-stack-kit/)** — browse upstream catalogs; copy `npx` commands. The extension **globe** button and **Full skill browser ↗** in Catalog open this site.

### GitHub token

For GitHub-backed catalog search, set **`GITHUB_TOKEN`** (CLI) or **`aiStackKit.githubToken`** (extension). Fine-grained PAT: **Contents** read on public repos.

---

## Pick a guide

### I use the terminal

→ **[CLI guide](./docs/CLI_GUIDE.md)** — install, command reference, env vars, troubleshooting.

### I use VS Code or Cursor

→ **[Extension guide](./docs/EXTENSION_GUIDE.md)** — Marketplace install, Activity Bar views, commands, settings.

### I use both

Common pattern: **extension** for day-to-day add/sync; **CLI** in CI (`aistack sync`) or for **`catalog refresh --write`**.

---

## More documentation

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — catalogs, PRs
- **[docs/CLI_UX_FLOWS.md](./docs/CLI_UX_FLOWS.md)** — CLI interaction targets
- **[EXTENSIONS.md](./EXTENSIONS.md)** — custom sources and adapters

Back to **[README.md](./README.md)**.
