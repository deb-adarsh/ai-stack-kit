# Ai Stack Kit — Architecture

This document is the **single architecture reference** for the project. It combines what used to be split between a long-form design doc and a high-level overview: visual diagrams and dependency rules live here alongside interfaces, repository layout, and operational detail.

## Overview

CLI tool that reads `spec.yaml`, resolves **skills**, **subagents**, and **hooks** (AI modules) from multiple sources, and applies them to IDEs through pluggable **client adapters**.

---

## Architecture principles

1. **Pluggable sources**: Modules can come from GitHub, npm, custom registries, local paths.
2. **IDE / client agnostic**: Cursor, VS Code Copilot, Claude layouts, etc., via `src/client-adapters/`.
3. **Spec-driven**: Declarative configuration (Terraform-style).
4. **CLI-first**: kubectl-style UX (`aistack` / `ai-stack`).
5. **Loose coupling**: Boundaries over concrete types; composition over inheritance.

---

## System architecture (diagram)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLI LAYER                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │   init   │  │ install  │  │  apply   │  │   sync   │  ...       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       └──────────────┴─────────────┴─────────────┘                  │
│                              │                                       │
│                    ┌─────────▼─────────┐                           │
│                    │   UI Components   │                            │
│                    │ (spinner, logger) │                            │
│                    └───────────────────┘                            │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                         CORE LAYER                                   │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                     ENGINE                                     │ │
│  │  Orchestrates: parse → resolve → fetch → apply                │ │
│  └───────────────┬───────────────────┬───────────────────────────┘ │
│                  │                   │                              │
│     ┌────────────▼─────────┐  ┌──────▼──────────┐                 │
│     │   SPEC PARSER        │  │    RESOLVER     │                  │
│     │ - Parse spec.yaml    │  │ - Dependency    │                  │
│     │ - Validate schema    │  │   graph         │                  │
│     └──────────────────────┘  │ - Version       │                  │
│                                │   resolution    │                  │
│                                └─────────────────┘                  │
└─────┬────────────────┬─────────────────┬─────────────────┬─────────┘
      │                │                 │                 │
┌─────▼──────┐  ┌──────▼──────┐  ┌──────▼─────┐  ┌───────▼────────┐
│  SOURCES   │  │  REGISTRY   │  │  ADAPTERS  │  │    STORAGE     │
│            │  │             │  │            │  │                │
│ ┌────────┐ │  │ ┌─────────┐ │  │ ┌────────┐ │  │ ┌────────────┐ │
│ │ GitHub │ │  │ │ Manager │ │  │ │ Cursor │ │  │ │   Cache    │ │
│ └────────┘ │  │ └─────────┘ │  │ └────────┘ │  │ └────────────┘ │
│            │  │             │  │            │  │                │
│ ┌────────┐ │  │ ┌─────────┐ │  │ ┌────────┐ │  │ ┌────────────┐ │
│ │  npm   │ │  │ │  Cache  │ │  │ │ VSCode │ │  │ │   State    │ │
│ └────────┘ │  │ └─────────┘ │  │ └────────┘ │  │ └────────────┘ │
│            │  │             │  │            │  │                │
│ ┌────────┐ │  │ ┌─────────┐ │  │ ┌────────┐ │  │ ┌────────────┐ │
│ │Registry│ │  │ │  Auth   │ │  │ │ Future │ │  │ │ Lock File  │ │
│ └────────┘ │  │ └─────────┘ │  │ └────────┘ │  │ └────────────┘ │
│            │  │             │  │            │  │                │
│ ┌────────┐ │  │             │  │            │  │                │
│ │ Local  │ │  │             │  │            │  │                │
│ └────────┘ │  │             │  │            │  │                │
└────────────┘  └─────────────┘  └────────────┘  └────────────────┘
      │                │                 │                 │
      └────────────────┴─────────────────┴─────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │      UTILS        │
                    │ (fs, git, semver) │
                    └───────────────────┘
```

## End-to-end data flow (diagram)

```
┌──────────┐
│ spec.yaml│
└────┬─────┘
     │
     ▼
┌─────────────────┐
│  Parse & Validate│
└────┬────────────┘
     │
     ▼
┌─────────────────┐     ┌──────────────┐
│ Resolve modules │────▶│ Query        │
│  & dependencies │     │ registries   │
└────┬────────────┘     └──────────────┘
     │
     ▼
┌─────────────────┐
│ Build dependency│
│     graph       │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Topological    │
│     sort        │
└────┬────────────┘
     │
     ▼
┌─────────────────┐     ┌──────────────┐
│ Fetch modules   │────▶│ Skill sources│
│   (parallel)    │     │ (GitHub, npm)│
└────┬────────────┘     └──────────────┘
     │
     ▼
┌─────────────────┐
│ Verify checksums│
└────┬────────────┘
     │
     ▼
┌─────────────────┐     ┌──────────────┐
│  Cache content  │────▶│ Local storage│
└────┬────────────┘     └──────────────┘
     │
     ▼
┌─────────────────┐
│ Write lock file │
└────┬────────────┘
     │
     ▼
┌─────────────────┐     ┌──────────────┐
│ Apply to client │────▶│Client adapter│
│  (normalize +   │     │Cursor/Copilot│
│   transform)    │     │   / Claude   │
└────┬────────────┘     └──────────────┘
     │
     ▼
┌─────────────────┐
│ Update IDE state│
└─────────────────┘
```

## Layers & dependency boundaries

### Layer dependencies (allowed → dependencies)

```
CLI
 └─→ Core (pipeline)
      ├─→ Sources
      ├─→ Registry
      ├─→ Client adapters
      ├─→ Storage (cache, lock paths)
      └─→ Utils

Sources
 └─→ Utils

Registry
 └─→ Utils

Client adapters
 └─→ Utils

Storage
 └─→ Utils

Utils
 └─→ (stdlib / no project layers)
```

### Critical rules

1. **No circular dependencies**: Higher layers depend only on lower layers.
2. **No cross-talk**: Sources, registry connectors, and client adapters do not call each other directly; the **pipeline** coordinates them.
3. **Orchestration is centralized**: Parse → resolve → fetch → normalize → write happens in one place (`src/pipeline/`).
4. **Utils stay thin**: Shared helpers only; no business orchestration.

### Interface boundaries (conceptual)

```
┌─────────────────────────────────────────┐
│         Pipeline / orchestration          │
│                                         │
│  Uses interfaces:                       │
│  - SkillSource                          │
│  - RegistryProvider                     │
│  - ClientAdapter (per IDE / client)      │
│                                         │
│  Does NOT import adapter internals       │
└─────────────────────────────────────────┘
           ▲         ▲         ▲
           │         │         │
    ┌──────┘    ┌────┘    └────┐
    │           │              │
┌───┴───┐  ┌───┴────┐  ┌──────┴───────┐
│GitHub │  │Registry│  │Cursor adapter│
│Source │  │Provider│  │  (+ others)  │
└───────┘  └────────┘  └──────────────┘
```

### Module responsibility matrix

| Layer | Module | Responsibility | Key interfaces / locations |
|-------|--------|----------------|----------------------------|
| **CLI** | Commands | Arg parsing, interactive UX | `src/cli/` |
| **Pipeline** | Apply / load | Orchestration, logging | `apply-pipeline.ts`, `spec-loader.ts` |
| **Sources** | GitHub, npm, … | Fetch module trees / tarballs | `SkillSource` in `src/sources/base/` |
| **Registry** | Discovery | Catalog search, dynamic providers | `RegistryProvider` in `src/registry/discovery/` |
| **Client adapters** | Cursor, Copilot, Claude | Normalized input → IDE files | `src/client-adapters/` |
| **Storage** | Cache, lock | Reproducible installs | `.aistack/`, configured paths |
| **Types / validation** | Schemas | Spec & registry shapes | `src/types/`, `src/validation/` |

---

## Repository layout (actual)

```
ai-stack-kit/
├── src/
│   ├── branding.ts              # CLI/product constants (.aistack, etc.)
│   ├── cli/                     # Commander entrypoint, commands, prompts
│   ├── pipeline/                # Load spec, apply pipeline, logging
│   ├── sources/                 # SkillSource + github / npm implementations
│   ├── registry/                # RegistryProvider, discovery, catalog sources
│   ├── client-adapters/         # Cursor, Copilot, Claude client outputs
│   ├── adapters/base/           # Legacy IDEAdapter sketch (optional reference)
│   ├── types/
│   └── validation/
├── config/                      # default.yaml, schema.json
├── templates/                   # spec template + client markdown tpl
└── tests/                       # (fixtures / tests as added)
```

---

## Core interfaces (reference shapes)

The blocks below summarize **intent**. Canonical TypeScript lives alongside implementations:

- **`SkillSource`** — `src/sources/base/skill-source.ts`
- **`RegistryProvider`** — `src/registry/discovery/registry-provider.ts`
- **IDE / client output** — today modeled as **`ClientAdapter`** and friends under `src/client-adapters/` (the `IDEAdapter` sketch below maps to that responsibility).

### 1. SkillSource Interface

```typescript
/**
 * Abstraction for fetching skills from various sources
 */
export interface SkillSource {
  readonly name: string;
  readonly type: SourceType; // 'github' | 'npm' | 'registry' | 'local'
  
  /**
   * Check if this source can handle the given skill reference
   */
  canHandle(reference: SkillReference): boolean;
  
  /**
   * Resolve a skill reference to full metadata
   */
  resolve(reference: SkillReference): Promise<SkillMetadata>;
  
  /**
   * Fetch skill content from source
   */
  fetch(metadata: SkillMetadata): Promise<SkillContent>;
  
  /**
   * List available versions for a skill
   */
  listVersions(reference: SkillReference): Promise<string[]>;
  
  /**
   * Validate credentials/authentication for this source
   */
  authenticate(credentials?: Credentials): Promise<boolean>;
}

export type SourceType = 'github' | 'npm' | 'registry' | 'local';

export interface SkillReference {
  source: string;        // 'github:owner/repo', 'npm:package', 'registry:name'
  name: string;          // Skill identifier
  version?: string;      // Semver or tag
  path?: string;         // Subpath in source
}

export interface SkillMetadata {
  id: string;
  name: string;
  version: string;
  source: SkillReference;
  description?: string;
  dependencies?: SkillReference[];
  checksum: string;
  fetchUrl: string;
}

export interface SkillContent {
  metadata: SkillMetadata;
  files: Map<string, string>; // filename -> content
  manifest: SkillManifest;
}
```

### 2. RegistryProvider Interface

```typescript
/**
 * Abstraction for registry operations (like npm registry)
 */
export interface RegistryProvider {
  readonly name: string;
  readonly url: string;
  
  /**
   * Search for skills in registry
   */
  search(query: string, options?: SearchOptions): Promise<RegistrySearchResult[]>;
  
  /**
   * Get full package metadata
   */
  getPackageInfo(name: string): Promise<PackageInfo>;
  
  /**
   * Get specific version metadata
   */
  getVersionInfo(name: string, version: string): Promise<VersionInfo>;
  
  /**
   * Resolve version range to concrete version
   */
  resolveVersion(name: string, versionRange: string): Promise<string>;
  
  /**
   * Publish a skill to the registry
   */
  publish(skill: SkillContent, options?: PublishOptions): Promise<PublishResult>;
  
  /**
   * Authenticate with registry
   */
  authenticate(token: string): Promise<boolean>;
}

export interface PackageInfo {
  name: string;
  description?: string;
  versions: string[];
  tags: Record<string, string>; // 'latest' -> '1.2.3'
  repository?: string;
  homepage?: string;
}

export interface VersionInfo {
  name: string;
  version: string;
  description?: string;
  dependencies?: Record<string, string>;
  dist: {
    tarball: string;
    shasum: string;
  };
}
```

### 3. IDEAdapter Interface

Today’s codebase implements the same responsibility as **`ClientAdapter`** (`src/client-adapters/client-adapter.ts`) and **`BaseClientAdapter`**. `src/adapters/base/ide-adapter.ts` is an older sketch for IDE-centric naming.

```typescript
/**
 * Abstraction for applying skills to different IDEs
 */
export interface IDEAdapter {
  readonly name: string;
  readonly supportedFeatures: IDEFeature[];
  
  /**
   * Detect if this IDE is installed and get its config path
   */
  detect(): Promise<IDEDetectionResult>;
  
  /**
   * Validate IDE environment
   */
  validate(): Promise<ValidationResult>;
  
  /**
   * Apply a skill to the IDE
   */
  applySkill(skill: SkillContent, options?: ApplyOptions): Promise<ApplyResult>;
  
  /**
   * Remove a skill from the IDE
   */
  removeSkill(skillId: string): Promise<RemoveResult>;
  
  /**
   * List currently installed skills
   */
  listInstalledSkills(): Promise<InstalledSkill[]>;
  
  /**
   * Sync IDE state with spec
   */
  sync(skills: SkillContent[]): Promise<SyncResult>;
  
  /**
   * Get IDE-specific configuration path
   */
  getConfigPath(): Promise<string>;
}

export type IDEFeature = 'skills' | 'rules' | 'hooks' | 'settings' | 'extensions';

export interface IDEDetectionResult {
  detected: boolean;
  version?: string;
  configPath?: string;
  userPath?: string;
}

export interface ApplyResult {
  success: boolean;
  skillId: string;
  filesWritten: string[];
  errors?: Error[];
}

export interface SyncResult {
  added: string[];
  updated: string[];
  removed: string[];
  unchanged: string[];
  errors?: Error[];
}
```

---

## Layer responsibilities (detail)

### CLI (`src/cli/`)

- Parse argv, route subcommands (`skill` / `subagent` / hook groups and legacy top-level commands).
- Interactive prompts, suggestion helpers, project detection.
- **Depends on**: pipeline helpers invoked from `commands.ts`, not on concrete sources/adapters directly.

### Pipeline (`src/pipeline/`)

- **`spec-loader`**: Load and validate `spec.yaml`.
- **`apply-pipeline`**: Resolve → fetch/install modules → normalize workspace input → run **AdapterFactory** → write outputs.
- **Logging**: structured console logger for phases.

### Sources (`src/sources/`)

- **`SkillSource`** implementations (GitHub, npm, …) and **`SkillSourceFactory`**.
- Network fetch, local extract, module-type awareness (`types/ai-module.ts`).
- **Must not** import client adapters.

### Registry (`src/registry/`)

- **`RegistryProvider`** and discovery implementations (local JSON, remote API, GitHub tree, npm tree, enterprise stubs).
- **`create-dynamic-skill-registry`**, `sources.config.yaml` loading for catalogs.
- Independent of CLI presentation and IDE output format.

### Client adapters (`src/client-adapters/`)

- **`BaseClientAdapter`** + Cursor / Copilot / Claude: map normalized agents/prompts/skills → files (`.cursor/`, `.vscode/settings.json` merge, `.aistack/` artifacts).
- **`adapter-factory.ts`** selects adapter by client type.
- **Must not** embed source-fetch logic.

### Types & validation (`src/types/`, `src/validation/`)

- Shared types for spec, skills, registry entries, CLI config.
- Zod / schema validation entry points as implemented.

---

## Operational command flows

Text versions of the pipelines (see also **End-to-end data flow** above).

### 1. Init flow

```
aistack init
    ↓
CLI (init command)
    ↓
Create template spec.yaml
    ↓
Initialize .aistack/ directory (when used by pipeline / settings)
    ↓
Create lock file (when generation is wired)
```

### 2. Install flow

```
aistack install
    ↓
CLI (install command)
    ↓
Pipeline (apply-pipeline / spec-loader)
    ↓
Parse spec.yaml
    ↓
Resolve modules (Resolver — planned / partial)
    │
    ├→ Query RegistryProvider / catalogs
    │
    ├→ Build dependency graph
    │
    └→ Topological sort
        ↓
Fetch via SkillSource (GitHub, npm, …)
    ↓
Verify checksums (when enabled)
    ↓
Store under configured cache / .aistack
    ↓
Update lock file
```

### 3. Apply flow

```
aistack apply
    ↓
CLI (apply command)
    ↓
Pipeline
    ↓
Load resolved / cached modules
    ↓
AdapterFactory → ClientAdapter (cursor / copilot / claude)
    ↓
Normalize → emit AdapterOutput files
    ↓
Write / merge into IDE directories
```

### 4. Sync flow (install + apply)

```
aistack sync
    ↓
Validate spec (when enforced)
    ↓
Run install stages + adapter apply (single pipeline pass as implemented)
    ↓
Report written files / errors
```

---

## Design patterns

1. **Strategy**: Pluggable sources, registry connectors, and client adapters.
2. **Factory**: `SkillSourceFactory`, `AdapterFactory`, dynamic registry creation.
3. **Repository-style persistence**: Cache + lock paths under `.aistack/` / configured dirs.
4. **Facade**: Pipeline hides fetch/normalize/apply steps from the CLI.

---

## Performance characteristics

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Parse spec.yaml | O(n) | Linear in file size |
| Resolve dependencies | O(n + e) | Graph traversal (n = modules, e = edges) |
| Fetch modules | O(n) | Parallel downloads where safe |
| Apply to IDE | O(n × m) | n modules, m output files per module |
| Cache lookup | O(1) | Hash / path keyed |

Operational tactics: parallel independent fetches, disk cache TTL for catalog providers, skip redundant writes when possible.

---

## Security model

```
┌────────────────────────────────────────┐
│         Security boundaries            │
├────────────────────────────────────────┤
│  Network (HTTPS), token env vars       │
│  Checksums / integrity where enforced   │
│  No arbitrary code exec at install     │
│  Safe merge strategies for IDE files   │
└────────────────────────────────────────┘
```

---

## CLI command reference

```bash
aistack init [--template <name>]
aistack install [--offline] [--force]
aistack apply [--dry-run]
aistack sync
aistack validate [--strict]
aistack status [--verbose]
aistack search <query>
aistack info <name>
aistack list [--tree]
aistack add [name] [--type skill|subagent|hook]
aistack remove <name>
aistack skill|subagent|hook search|add|info ...
aistack update [name] [--latest]
aistack publish | login | logout   # when implemented
aistack clean [--cache] [--all]
```

Also available as the **`ai-stack`** binary (same executable).

---

## Configuration precedence

```
Environment variables   (override)
        ↓
Global ~/.aistack/config.yaml   (when present)
        ↓
Project spec.yaml
        ↓
CLI flags
```

---

## Configuration System

### spec.yaml Structure

```yaml
# Ai Stack Kit Configuration
version: "1.0"

# Global settings
settings:
  cacheDir: ~/.aistack/cache
  lockFile: .aistack/lock.yaml
  autoSync: true

# Registries (like npm registries)
registries:
  - name: default
    url: https://registry.aistack.dev
    auth: ${AISTACK_TOKEN}
  
  - name: company-private
    url: https://skills.company.internal
    auth: ${COMPANY_REGISTRY_TOKEN}

# Skill sources
sources:
  - type: github
    name: official
    repository: aistack/skills
    branch: main
    auth: ${GITHUB_TOKEN}
  
  - type: npm
    name: npm-skills
    scope: "@aistack"
  
  - type: registry
    name: company-registry
    registry: company-private
  
  - type: local
    name: workspace-skills
    path: ./local-skills

# Target IDE
ide:
  type: cursor
  configPath: ~/.cursor
  features:
    - skills
    - rules
    - hooks

# Skills to install
skills:
  # From GitHub
  - source: github:official
    name: maersk-figma-agent
    version: ^1.0.0
  
  # From npm
  - source: npm:npm-skills
    name: "@aistack/canvas"
    version: latest
  
  # From custom registry
  - source: registry:company-private
    name: internal-skill
    version: ~2.1.0
  
  # From local path
  - source: local:workspace-skills
    name: my-custom-skill
    path: ./skills/my-custom-skill

# Hooks (lifecycle events)
hooks:
  preInstall:
    - echo "Starting installation..."
  
  postInstall:
    - echo "Installation complete"
  
  preApply:
    - echo "Applying to IDE..."
  
  postApply:
    - echo "Applied successfully"
```

### Lock File Structure (.aistack/lock.yaml)

```yaml
# Auto-generated lock file (like package-lock.json)
version: "1.0"
generated: 2026-05-01T05:47:00.000Z

resolved:
  - id: github:aistack/skills/maersk-figma-agent@1.2.3
    name: maersk-figma-agent
    version: 1.2.3
    source: github:official
    resolved: https://github.com/aistack/skills/tree/main/maersk-figma-agent
    checksum: sha256:abc123...
    dependencies:
      - github:aistack/skills/figma-base@1.0.0
  
  - id: npm:@aistack/canvas@2.0.1
    name: "@aistack/canvas"
    version: 2.0.1
    source: npm:npm-skills
    resolved: https://registry.npmjs.org/@aistack/canvas/-/canvas-2.0.1.tgz
    checksum: sha256:def456...
    dependencies: []
  
  - id: registry:company-private/internal-skill@2.1.3
    name: internal-skill
    version: 2.1.3
    source: registry:company-private
    resolved: https://skills.company.internal/packages/internal-skill/2.1.3
    checksum: sha256:ghi789...
    dependencies: []

applied:
  ide: cursor
  path: /Users/user/.cursor
  skills:
    - id: github:aistack/skills/maersk-figma-agent@1.2.3
      appliedAt: 2026-05-01T05:47:30.000Z
      files:
        - /Users/user/.cursor/skills/maersk-figma-agent/SKILL.md
    
    - id: npm:@aistack/canvas@2.0.1
      appliedAt: 2026-05-01T05:47:31.000Z
      files:
        - /Users/user/.cursor/skills/canvas/SKILL.md
```

---

## Example Usage

### Basic Workflow

```bash
# Initialize a new project
aistack init

# Edit spec.yaml to add skills / subagents / hooks

# Install (fetch / cache) then apply to IDE — or sync for both
aistack install
aistack apply
aistack sync

aistack validate
aistack status

# Discovery (all kinds)
aistack search figma

# Typed discovery / add
aistack skill search canvas
aistack subagent add my-agent
aistack hook info my-hook

# Legacy top-level add / remove
aistack add github:official/new-skill
aistack remove maersk-figma-agent

aistack update
aistack update maersk-figma-agent
```

---

## Extension Points

### Adding a new source (e.g. GitLab)

1. Add `src/sources/<name>/<name>-source.ts` implementing **`SkillSource`** (`src/sources/base/skill-source.ts`).
2. Register the implementation in **`src/sources/skill-source-factory.ts`** (or equivalent wiring).
3. Extend **`config/schema.json`** / validation if a new `source` discriminator is required.

### Adding a new registry connector

1. Implement **`RegistryProvider`** (`src/registry/discovery/registry-provider.ts`).
2. Register from **`create-dynamic-skill-registry.ts`** or the discovery index as appropriate.
3. Optionally add a row shape to **`sources.config.yaml`** loading (`src/registry/sources/load-sources-config.ts`).

### Adding a new client / IDE target

1. Add **`src/client-adapters/<client>/<client>-adapter.ts`** extending **`BaseClientAdapter`**.
2. Register in **`src/client-adapters/adapter-factory.ts`**.
3. Add bundled templates under **`templates/clients/<client>/`** when needed.

---

## Error handling

### Categories & exit codes (target)

```typescript
enum ErrorCode {
  USER_ERROR = 1,
  NETWORK_ERROR = 2,
  SYSTEM_ERROR = 3,
  IDE_ERROR = 4,
  REGISTRY_ERROR = 5,
  CONFLICT_ERROR = 6,
}
```

Flow: surface actionable CLI messages; on recoverable network faults prefer cache / retry; on apply failures consider rollback of writes where implemented.

### Operational categories

1. **User errors**: Invalid spec, missing files — explain fix, exit `1`.
2. **Network errors**: Timeouts, 403/5xx — retry/backoff, optional cache fallback, exit `2`.
3. **System errors**: Permissions, disk — exit `3`.
4. **Client / IDE errors**: Missing tool, bad paths — exit `4`.

### Rollback strategy

- Preserve previous IDE config where merge strategies support it.
- Log diffs; avoid silent partial writes when `strict` modes exist.

---

## Testing Strategy

1. **Unit Tests**: Each module in isolation
2. **Integration Tests**: Module interactions
3. **E2E Tests**: Full CLI workflows
4. **Fixture-Based**: Test with sample skills and registries
5. **Mock Sources/Adapters**: Test without network/IDE dependencies

---

## Future Enhancements

1. **Watch Mode**: Auto-sync on spec.yaml changes
2. **Skill Templates**: Scaffold new skills
3. **Diff Command**: Show changes before applying
4. **Backup/Restore**: Save and restore IDE state
5. **Migration Tool**: Migrate from manual setup to aistack
6. **Plugin System**: Third-party sources/adapters
7. **Web UI**: Visual spec editor
8. **Team Sync**: Share configs across team
9. **Skill Marketplace**: Browse and discover skills
10. **Analytics**: Track skill usage (opt-in)

---

## Comparison to Similar Tools

### Like npm
- Registry abstraction (public/private)
- Lock file for reproducibility
- Dependency resolution
- Semantic versioning

### Like Terraform
- Declarative spec file
- Plan/apply workflow
- State management
- Idempotent operations

### Like kubectl
- CLI-first design
- Rich terminal output
- Imperative and declarative modes
- Multiple resource types

---

This architecture aims for:

- **Extensibility**: New sources, registry connectors, and client adapters without rewriting the pipeline.
- **Testability**: Boundaries at `SkillSource`, `RegistryProvider`, and `ClientAdapter`.
- **Maintainability**: CLI stays thin; orchestration stays in `src/pipeline/`.
- **UX**: kubectl-style CLI, helpful errors, reproducible installs via lock/cache conventions.

For deeper diagrams only, see **[DIAGRAMS.md](./DIAGRAMS.md)**.
