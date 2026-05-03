# AI Stack Kit - Quick Reference Guide

## Core Concepts

### 1. Skills
Reusable IDE configurations (like Cursor skills, rules, hooks) packaged and distributed.

### 2. Sources
Where skills come from: GitHub, npm, custom registries, or local files.

### 3. Registries
Centralized repositories for discovering and fetching skills (like npm registry).

### 4. Adapters
IDE-specific implementations that apply skills to Cursor, VSCode, etc.

### 5. Spec File (`spec.yaml`)
Declarative configuration defining which skills to install and how.

### 6. Lock File (`.aistack/lock.yaml`)
Auto-generated file with exact versions and checksums (like `package-lock.json`).

---

## Quick Start

```bash
# 1. Initialize project
aistack init

# 2. Edit spec.yaml to add skills

# 3. Install and apply
aistack sync
```

---

## Command Cheat Sheet

```bash
# Project Management
aistack init                 # Initialize new project
aistack validate             # Validate spec.yaml
aistack status               # Show installation status

# Skill Management — **`install` / `apply` / `sync` read `spec.yaml`** (`skills:` + `modules:`); no skill name on these commands. Use **`add`** first to put modules in the spec.
aistack install              # Resolve → fetch/cache → adapter writes (everything enabled in spec.yaml)
aistack apply                # Same full pipeline as `install` today
aistack sync                 # Validate spec, then same pipeline (also ensures managed `.gitignore` if missing)
aistack update               # Update all skills
aistack update <skill>       # Update specific skill

# Discovery (`search` hits GitHub REST per configured source — export token to avoid shared-IP rate limits)
export GITHUB_TOKEN=ghp_…   # or fine-grained PAT with Contents read on public repos
aistack search <query>       # Search registries
aistack info <skill>         # Show skill details
aistack list                 # List installed skills

# Modification
aistack add <skill>          # Add skill to spec.yaml
aistack remove <skill>       # Remove skill from spec.yaml

# Registry
aistack login                # Login to registry
aistack logout               # Logout from registry
aistack publish              # Publish skill

# Maintenance
aistack clean                # Clean cache
```

---

## Configuration Examples

### Minimal spec.yaml
```yaml
version: "1.0"
ide:
  type: cursor
skills:
  - source: github:official
    name: canvas
    version: latest
```

### Complete spec.yaml
```yaml
version: "1.0"

settings:
  cacheDir: ~/.aistack/cache
  parallelDownloads: 5
  retryAttempts: 3

registries:
  - name: default
    url: https://registry.aistack.dev
    auth: ${AISTACK_TOKEN}

sources:
  - type: github
    name: official
    repository: aistack/skills
    auth: ${GITHUB_TOKEN}
  - type: local
    name: workspace
    path: ./local-skills

ide:
  type: cursor
  features:
    - skills
    - rules
    - hooks

skills:
  - source: github:official
    name: canvas
    version: ^2.0.0
  - source: local:workspace
    name: my-skill
    path: ./skills/my-skill

hooks:
  postApply:
    - echo "Skills applied!"
```

---

## Skill Reference Formats

| Format | Example | Description |
|--------|---------|-------------|
| GitHub | `github:official` | From configured GitHub source |
| npm | `npm:npm-skills` | From configured npm source |
| Registry | `registry:company` | From custom registry |
| Local | `local:workspace` | From local filesystem |

---

## Version Specifiers

| Specifier | Meaning | Example |
|-----------|---------|---------|
| `1.2.3` | Exact version | `1.2.3` |
| `^1.2.3` | Compatible (minor) | `1.2.3` to `<2.0.0` |
| `~1.2.3` | Patch updates | `1.2.3` to `<1.3.0` |
| `>=1.2.3` | Minimum version | `1.2.3` and above |
| `latest` | Latest version | Most recent |
| `*` | Any version | Latest stable |

---

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `AISTACK_TOKEN` | Default registry token | `export AISTACK_TOKEN=abc123` |
| `AISTACK_CACHE_DIR` | Override cache dir | `~/.cache/aistack` |
| `AISTACK_LOG_LEVEL` | Log verbosity | `debug`, `info`, `warn`, `error` |
| `GITHUB_TOKEN` | Higher GitHub **REST** limits for **`aistack search`** / catalog listing + **private** skill repos | `export GITHUB_TOKEN=ghp_…` (fine-grained: **Contents** read on public repos) |

---

## Dependency Resolution

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

## File Locations

| File/Directory | Purpose | Location |
|----------------|---------|----------|
| `spec.yaml` | Project configuration | Project root |
| `.aistack/lock.yaml` | Lock file | Project root |
| `~/.aistack/cache/` | Downloaded skills | User home |
| `~/.aistack/config.yaml` | Global config | User home |
| `~/.cursor/skills/` | Installed skills (Cursor) | User home |

---

## Error Codes

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

## Workflow Patterns

### Pattern 1: Fresh Install
```bash
# Clone project
git clone repo && cd repo

# Sync skills from spec.yaml
aistack sync

# Start coding with skills enabled
```

### Pattern 2: Add New Skill
```bash
# Search for skill
aistack search figma

# Add to spec.yaml
aistack add github:official/figma-agent

# Apply changes
aistack sync
```

### Pattern 3: Update Skills
```bash
# Update all to latest compatible
aistack update

# Or update specific skill
aistack update canvas

# Verify changes
aistack status
```

### Pattern 4: Share Configuration
```bash
# Commit spec.yaml and lock file
git add spec.yaml .aistack/lock.yaml
git commit -m "Add aistack configuration"
git push

# Team members sync
git pull
aistack sync
```

---

## Best Practices

### 1. Use Lock Files
Always commit `.aistack/lock.yaml` for reproducible installs.

### 2. Version Constraints
Use `^` for libraries (minor updates), exact versions for critical dependencies.

### 3. Private Registries
Use environment variables for tokens, never commit credentials.

### 4. Local Development
Use `local:` sources for development, switch to `github:` or `registry:` for production.

### 5. Hooks
Keep hooks simple and fast. Use them for notifications, not heavy processing.

### 6. Validation
Always run `aistack validate` before committing changes.

### 7. Caching
Let aistack manage cache. Use `aistack clean` if issues occur.

---

## Troubleshooting

### Skills not applying
```bash
# Check IDE detection
aistack status --verbose

# Validate spec
aistack validate

# Re-apply with force
aistack apply --force
```

### Network errors
```bash
# Try with cached data
aistack install --offline

# Increase timeout
AISTACK_TIMEOUT=60000 aistack install

# Clear cache and retry
aistack clean --cache
aistack install
```

### Dependency conflicts
```bash
# Show dependency tree
aistack list --tree

# Resolve by pinning versions in spec.yaml
# Change: version: ^1.0.0
# To:     version: 1.2.3
```

---

This guide covers common CLI usage and configuration. For repo layout and extending the toolkit, see **[ARCHITECTURE.md](./ARCHITECTURE.md)** and **[EXTENSIONS.md](./EXTENSIONS.md)**.
