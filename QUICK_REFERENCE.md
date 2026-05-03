# Spec Engine - Quick Reference Guide

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

### 6. Lock File (`.spec-engine/lock.yaml`)
Auto-generated file with exact versions and checksums (like `package-lock.json`).

---

## Quick Start

```bash
# 1. Initialize project
spec-engine init

# 2. Edit spec.yaml to add skills

# 3. Install and apply
spec-engine sync
```

---

## Interface Summary

### SkillSource Interface
**Purpose**: Fetch skills from various sources

**Key Methods**:
- `canHandle(reference)` - Check if source handles this skill
- `resolve(reference)` - Get metadata (version, checksum, URL)
- `fetch(metadata)` - Download skill content
- `listVersions(reference)` - Get available versions

**Implementations**: GitHub, npm, Registry, Local

---

### RegistryProvider Interface
**Purpose**: Query and publish to skill registries

**Key Methods**:
- `search(query)` - Search for skills
- `getPackageInfo(name)` - Get all versions
- `getVersionInfo(name, version)` - Get specific version
- `resolveVersion(name, range)` - Resolve semver range
- `publish(skill)` - Publish new skill

**Implementations**: Default registry, custom registries

---

### IDEAdapter Interface
**Purpose**: Apply skills to specific IDEs

**Key Methods**:
- `detect()` - Find IDE installation
- `validate()` - Check IDE environment
- `applySkill(skill)` - Install skill to IDE
- `removeSkill(skillId)` - Uninstall skill
- `sync(skills)` - Sync IDE with spec

**Implementations**: Cursor, VSCode, (future: IntelliJ, etc.)

---

## Module Quick Reference

| Module | Location | Purpose | Key Exports |
|--------|----------|---------|-------------|
| **CLI Commands** | `src/cli/commands/` | User-facing commands | `init`, `install`, `apply`, `sync` |
| **Core Engine** | `src/core/engine/` | Orchestration | `Engine` class |
| **Spec Parser** | `src/core/spec/` | Parse spec.yaml | `parseSpec`, `validateSpec` |
| **Resolver** | `src/core/resolver/` | Dependency resolution | `resolveSkills` |
| **GitHub Source** | `src/sources/github/` | Fetch from GitHub | `GitHubSource` class |
| **npm Source** | `src/sources/npm/` | Fetch from npm | `NpmSource` class |
| **Registry Manager** | `src/registry/` | Registry operations | `RegistryManager` |
| **Cursor Adapter** | `src/adapters/cursor/` | Apply to Cursor | `CursorAdapter` |
| **Cache Manager** | `src/storage/cache-manager.ts` | Local caching | `CacheManager` |
| **State Manager** | `src/storage/state-manager.ts` | State persistence | `StateManager` |

---

## Command Cheat Sheet

```bash
# Project Management
spec-engine init                 # Initialize new project
spec-engine validate             # Validate spec.yaml
spec-engine status               # Show installation status

# Skill Management
spec-engine install              # Install skills (download)
spec-engine apply                # Apply skills to IDE
spec-engine sync                 # Install + Apply
spec-engine update               # Update all skills
spec-engine update <skill>       # Update specific skill

# Discovery
spec-engine search <query>       # Search registries
spec-engine info <skill>         # Show skill details
spec-engine list                 # List installed skills

# Modification
spec-engine add <skill>          # Add skill to spec.yaml
spec-engine remove <skill>       # Remove skill from spec.yaml

# Registry
spec-engine login                # Login to registry
spec-engine logout               # Logout from registry
spec-engine publish              # Publish skill

# Maintenance
spec-engine clean                # Clean cache
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
  cacheDir: ~/.spec-engine/cache
  parallelDownloads: 5
  retryAttempts: 3

registries:
  - name: default
    url: https://registry.spec-engine.dev
    auth: ${SPEC_ENGINE_TOKEN}

sources:
  - type: github
    name: official
    repository: spec-engine/skills
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
| `SPEC_ENGINE_TOKEN` | Default registry token | `export SPEC_ENGINE_TOKEN=abc123` |
| `SPEC_ENGINE_CACHE_DIR` | Override cache dir | `~/.cache/spec-engine` |
| `SPEC_ENGINE_LOG_LEVEL` | Log verbosity | `debug`, `info`, `warn`, `error` |
| `GITHUB_TOKEN` | GitHub authentication | For private repos |
| `NPM_TOKEN` | npm authentication | For private packages |

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
| `.spec-engine/lock.yaml` | Lock file | Project root |
| `~/.spec-engine/cache/` | Downloaded skills | User home |
| `~/.spec-engine/config.yaml` | Global config | User home |
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
spec-engine sync

# Start coding with skills enabled
```

### Pattern 2: Add New Skill
```bash
# Search for skill
spec-engine search figma

# Add to spec.yaml
spec-engine add github:official/figma-agent

# Apply changes
spec-engine sync
```

### Pattern 3: Update Skills
```bash
# Update all to latest compatible
spec-engine update

# Or update specific skill
spec-engine update canvas

# Verify changes
spec-engine status
```

### Pattern 4: Share Configuration
```bash
# Commit spec.yaml and lock file
git add spec.yaml .spec-engine/lock.yaml
git commit -m "Add spec-engine configuration"
git push

# Team members sync
git pull
spec-engine sync
```

---

## Testing Your Implementation

### Unit Test Structure
```typescript
// Test a skill source
describe('GitHubSource', () => {
  it('should resolve skill version', async () => {
    const source = new GitHubSource('test', {});
    const metadata = await source.resolve({
      source: 'github:test',
      name: 'skill',
      version: '^1.0.0'
    });
    expect(metadata.version).toMatch(/^1\.\d+\.\d+$/);
  });
});
```

### Integration Test Structure
```typescript
// Test engine orchestration
describe('Engine', () => {
  it('should install and apply skills', async () => {
    const engine = new Engine(config);
    await engine.install();
    await engine.apply();
    
    const skills = await adapter.listInstalledSkills();
    expect(skills).toHaveLength(2);
  });
});
```

---

## Extension Examples

### Custom Source Implementation
```typescript
import { BaseSkillSource } from './base/skill-source';

export class GitLabSource extends BaseSkillSource {
  constructor(name: string) {
    super(name, 'gitlab');
  }
  
  canHandle(reference: SkillReference): boolean {
    return reference.source.startsWith('gitlab:');
  }
  
  async resolve(reference: SkillReference): Promise<SkillMetadata> {
    // Fetch from GitLab API
  }
  
  // ... implement other methods
}
```

### Custom IDE Adapter
```typescript
import { BaseIDEAdapter } from './base/ide-adapter';

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

## Best Practices

### 1. Use Lock Files
Always commit `.spec-engine/lock.yaml` for reproducible installs.

### 2. Version Constraints
Use `^` for libraries (minor updates), exact versions for critical dependencies.

### 3. Private Registries
Use environment variables for tokens, never commit credentials.

### 4. Local Development
Use `local:` sources for development, switch to `github:` or `registry:` for production.

### 5. Hooks
Keep hooks simple and fast. Use them for notifications, not heavy processing.

### 6. Validation
Always run `spec-engine validate` before committing changes.

### 7. Caching
Let spec-engine manage cache. Use `spec-engine clean` if issues occur.

---

## Troubleshooting

### Skills not applying
```bash
# Check IDE detection
spec-engine status --verbose

# Validate spec
spec-engine validate

# Re-apply with force
spec-engine apply --force
```

### Network errors
```bash
# Try with cached data
spec-engine install --offline

# Increase timeout
SPEC_ENGINE_TIMEOUT=60000 spec-engine install

# Clear cache and retry
spec-engine clean --cache
spec-engine install
```

### Dependency conflicts
```bash
# Show dependency tree
spec-engine list --tree

# Resolve by pinning versions in spec.yaml
# Change: version: ^1.0.0
# To:     version: 1.2.3
```

---

This reference should help you navigate the architecture and implement the system effectively!
