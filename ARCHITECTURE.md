# Spec Engine - Architecture Design

## Overview
A CLI tool that reads `spec.yaml`, resolves skills/subagents from multiple sources, and applies them to various IDEs through pluggable adapters.

---

## Architecture Principles

1. **Pluggable Sources**: Skills can come from GitHub, npm, custom registries
2. **IDE Agnostic**: Support Cursor, VSCode, and future IDEs via adapters
3. **Spec-Driven**: Declarative configuration (like Terraform)
4. **CLI-First**: Rich terminal UX (like kubectl)
5. **Loose Coupling**: Modules communicate via well-defined interfaces

---

## Folder Structure

```
spec-engine/
├── src/
│   ├── cli/                      # CLI entry point & commands
│   │   ├── index.ts              # CLI bootstrap
│   │   ├── commands/
│   │   │   ├── init.ts           # spec-engine init
│   │   │   ├── install.ts        # spec-engine install
│   │   │   ├── apply.ts          # spec-engine apply
│   │   │   ├── sync.ts           # spec-engine sync
│   │   │   └── validate.ts       # spec-engine validate
│   │   └── ui/
│   │       ├── spinner.ts        # Progress indicators
│   │       ├── logger.ts         # Structured logging
│   │       └── prompts.ts        # User input
│   │
│   ├── core/                     # Core business logic
│   │   ├── spec/
│   │   │   ├── parser.ts         # spec.yaml parser
│   │   │   ├── validator.ts     # Spec schema validation
│   │   │   └── types.ts          # Spec type definitions
│   │   ├── resolver/
│   │   │   ├── resolver.ts       # Main resolution orchestrator
│   │   │   ├── dependency-graph.ts # Dependency resolution
│   │   │   └── version-resolver.ts # Semantic versioning
│   │   └── engine/
│   │       ├── engine.ts         # Main orchestration engine
│   │       └── lifecycle.ts      # Lifecycle hooks
│   │
│   ├── sources/                  # Pluggable skill sources
│   │   ├── base/
│   │   │   └── skill-source.ts   # SkillSource interface
│   │   ├── github/
│   │   │   ├── github-source.ts  # GitHub implementation
│   │   │   └── github-client.ts  # GitHub API wrapper
│   │   ├── npm/
│   │   │   ├── npm-source.ts     # npm implementation
│   │   │   └── npm-client.ts     # npm registry client
│   │   ├── registry/
│   │   │   ├── registry-source.ts # Custom registry impl
│   │   │   └── registry-client.ts # Registry API client
│   │   └── local/
│   │       └── local-source.ts   # File system source
│   │
│   ├── registry/                 # Registry abstraction
│   │   ├── base/
│   │   │   └── registry-provider.ts # RegistryProvider interface
│   │   ├── manager.ts            # Registry management
│   │   ├── cache.ts              # Local cache layer
│   │   └── authenticator.ts     # Auth for private registries
│   │
│   ├── adapters/                 # IDE-specific adapters
│   │   ├── base/
│   │   │   └── ide-adapter.ts    # IDEAdapter interface
│   │   ├── cursor/
│   │   │   ├── cursor-adapter.ts # Cursor implementation
│   │   │   ├── skills.ts         # Cursor skills handler
│   │   │   ├── rules.ts          # Cursor rules handler
│   │   │   └── hooks.ts          # Cursor hooks handler
│   │   ├── vscode/
│   │   │   └── vscode-adapter.ts # VSCode implementation
│   │   └── factory.ts            # Adapter factory
│   │
│   ├── storage/                  # Local storage layer
│   │   ├── cache-manager.ts      # Cache management
│   │   ├── skill-store.ts        # Installed skills storage
│   │   └── state-manager.ts      # CLI state persistence
│   │
│   ├── utils/                    # Shared utilities
│   │   ├── fs.ts                 # File system helpers
│   │   ├── git.ts                # Git operations
│   │   ├── semver.ts             # Version utilities
│   │   ├── hash.ts               # Content hashing
│   │   └── validation.ts         # Common validators
│   │
│   └── types/                    # Shared type definitions
│       ├── skill.ts              # Skill types
│       ├── spec.ts               # Spec types
│       ├── registry.ts           # Registry types
│       └── config.ts             # Config types
│
├── config/
│   ├── default.yaml              # Default configuration
│   └── schema.json               # spec.yaml JSON schema
│
├── templates/
│   └── spec.yaml                 # Template spec file
│
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
```

---

## Core Interfaces

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

## Module Responsibilities

### CLI Layer (`src/cli/`)
**Responsibility**: User interaction, command routing, presentation
- Parse command-line arguments
- Display rich terminal UI (spinners, tables, colors)
- Handle user prompts and confirmations
- Format output (JSON, YAML, table)
- Error presentation

**Dependencies**: `core/`, `utils/`
**No Dependencies On**: `sources/`, `adapters/` (accessed via core)

---

### Core Layer (`src/core/`)
**Responsibility**: Orchestration, business logic, coordination

#### Spec Module (`core/spec/`)
- Parse and validate `spec.yaml`
- Schema validation against JSON schema
- Type-safe spec representation

#### Resolver Module (`core/resolver/`)
- Resolve skill references to concrete versions
- Build dependency graph
- Handle version conflicts
- Topological sort for install order

#### Engine Module (`core/engine/`)
- Main orchestration: parse → resolve → fetch → apply
- Lifecycle management (pre/post hooks)
- State transitions
- Error recovery

**Dependencies**: `sources/`, `registry/`, `adapters/`, `storage/`, `utils/`

---

### Sources Layer (`src/sources/`)
**Responsibility**: Fetch skills from various origins
- Implement `SkillSource` interface
- Handle source-specific authentication
- Rate limiting, retries, caching
- Content verification (checksums)

**Dependencies**: `utils/`, `types/`
**No Dependencies On**: `core/`, `adapters/`

---

### Registry Layer (`src/registry/`)
**Responsibility**: Registry abstraction (like npm registry)
- Implement `RegistryProvider` interface
- Manage multiple registries (public, private)
- Authentication token management
- Local cache for registry queries

**Dependencies**: `utils/`, `types/`
**No Dependencies On**: `core/`, `adapters/`, `sources/`

---

### Adapters Layer (`src/adapters/`)
**Responsibility**: IDE-specific implementation
- Implement `IDEAdapter` interface
- Detect IDE installation
- Apply skills to IDE-specific formats
- Manage IDE configuration files
- Handle IDE-specific quirks

**Dependencies**: `utils/`, `types/`
**No Dependencies On**: `core/`, `sources/`, `registry/`

---

### Storage Layer (`src/storage/`)
**Responsibility**: Local persistence
- Cache downloaded skills
- Store installation state
- Lock file management (like package-lock.json)
- Content-addressable storage

**Dependencies**: `utils/`, `types/`
**No Dependencies On**: Any other layers

---

### Utils Layer (`src/utils/`)
**Responsibility**: Shared utilities
- File system operations
- Git operations
- Semver parsing and comparison
- Hashing and checksums
- Validation helpers

**Dependencies**: None

---

## Data Flow

### 1. Init Flow
```
spec-engine init
    ↓
CLI (init command)
    ↓
Create template spec.yaml
    ↓
Initialize .spec-engine/ directory
    ↓
Create lock file
```

### 2. Install Flow
```
spec-engine install
    ↓
CLI (install command)
    ↓
Core Engine
    ↓
Parse spec.yaml (Spec Parser)
    ↓
Resolve Skills (Resolver)
    │
    ├→ Query Registry (RegistryProvider)
    │   └→ Resolve versions
    │
    ├→ Build dependency graph
    │   └→ Detect conflicts
    │
    └→ Topological sort
        ↓
Fetch Skills (SkillSource)
    │
    ├→ GitHub Source (if github:)
    ├→ npm Source (if npm:)
    ├→ Registry Source (if registry:)
    └→ Local Source (if file:)
        ↓
Verify checksums
    ↓
Store in cache (Storage)
    ↓
Update lock file
```

### 3. Apply Flow
```
spec-engine apply
    ↓
CLI (apply command)
    ↓
Core Engine
    ↓
Read lock file
    ↓
Detect IDE (Adapter Factory)
    │
    ├→ Cursor Adapter
    ├→ VSCode Adapter
    └→ (future adapters)
        ↓
Validate IDE environment
    ↓
Load cached skills (Storage)
    ↓
Transform for IDE (IDEAdapter)
    │
    ├→ Convert to IDE format
    ├→ Resolve IDE-specific paths
    └→ Merge configurations
        ↓
Write to IDE config directory
    ↓
Verify installation
    ↓
Update state
```

### 4. Sync Flow (Install + Apply combined)
```
spec-engine sync
    ↓
Run Install Flow
    ↓
Run Apply Flow
    ↓
Report changes
```

---

## Dependency Boundaries

### Layered Architecture (Top → Bottom)

```
┌─────────────────────────────────────┐
│           CLI Layer                 │  ← User interaction
│  (commands, UI, presentation)       │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│          Core Layer                 │  ← Orchestration
│  (engine, resolver, spec parser)    │
└──┬───────┬────────┬────────┬────────┘
   │       │        │        │
   ↓       ↓        ↓        ↓
┌────┐  ┌────┐  ┌────┐  ┌────────┐
│Src │  │Reg │  │Adp │  │Storage │    ← Implementations
└────┘  └────┘  └────┘  └────────┘
   │       │        │        │
   └───────┴────────┴────────┘
               │
               ↓
         ┌──────────┐
         │  Utils   │                  ← Shared utilities
         └──────────┘
```

### Key Rules

1. **CLI → Core → Implementations**
   - CLI never directly imports from `sources/`, `adapters/`, `registry/`
   - All access goes through Core Engine

2. **Core owns the interfaces**
   - `SkillSource`, `RegistryProvider`, `IDEAdapter` defined in `sources/base/`, `registry/base/`, `adapters/base/`
   - Core Engine accepts these interfaces, not concrete implementations

3. **Implementations are independent**
   - `sources/` doesn't know about `adapters/`
   - `adapters/` doesn't know about `sources/`
   - `registry/` is independent of both

4. **Storage is a dumb layer**
   - No business logic
   - Pure persistence operations
   - Used by Core, not by implementations

5. **Utils is leaf-level**
   - No imports from any business logic layers
   - Pure functions only

---

## Configuration System

### spec.yaml Structure

```yaml
# Spec Engine Configuration
version: "1.0"

# Global settings
settings:
  cacheDir: ~/.spec-engine/cache
  lockFile: .spec-engine/lock.yaml
  autoSync: true

# Registries (like npm registries)
registries:
  - name: default
    url: https://registry.spec-engine.dev
    auth: ${SPEC_ENGINE_TOKEN}
  
  - name: company-private
    url: https://skills.company.internal
    auth: ${COMPANY_REGISTRY_TOKEN}

# Skill sources
sources:
  - type: github
    name: official
    repository: spec-engine/skills
    branch: main
    auth: ${GITHUB_TOKEN}
  
  - type: npm
    name: npm-skills
    scope: "@spec-engine"
  
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
    name: "@spec-engine/canvas"
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

### Lock File Structure (.spec-engine/lock.yaml)

```yaml
# Auto-generated lock file (like package-lock.json)
version: "1.0"
generated: 2026-05-01T05:47:00.000Z

resolved:
  - id: github:spec-engine/skills/maersk-figma-agent@1.2.3
    name: maersk-figma-agent
    version: 1.2.3
    source: github:official
    resolved: https://github.com/spec-engine/skills/tree/main/maersk-figma-agent
    checksum: sha256:abc123...
    dependencies:
      - github:spec-engine/skills/figma-base@1.0.0
  
  - id: npm:@spec-engine/canvas@2.0.1
    name: "@spec-engine/canvas"
    version: 2.0.1
    source: npm:npm-skills
    resolved: https://registry.npmjs.org/@spec-engine/canvas/-/canvas-2.0.1.tgz
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
    - id: github:spec-engine/skills/maersk-figma-agent@1.2.3
      appliedAt: 2026-05-01T05:47:30.000Z
      files:
        - /Users/user/.cursor/skills/maersk-figma-agent/SKILL.md
    
    - id: npm:@spec-engine/canvas@2.0.1
      appliedAt: 2026-05-01T05:47:31.000Z
      files:
        - /Users/user/.cursor/skills/canvas/SKILL.md
```

---

## Example Usage

### Basic Workflow

```bash
# Initialize a new project
spec-engine init

# Edit spec.yaml to add skills

# Install skills (downloads and caches)
spec-engine install

# Apply to IDE (writes to IDE config)
spec-engine apply

# Or do both at once
spec-engine sync

# Validate spec.yaml
spec-engine validate

# Show installation status
spec-engine status

# List available skills from registries
spec-engine search figma

# Add a new skill
spec-engine add github:official/new-skill

# Remove a skill
spec-engine remove maersk-figma-agent

# Update all skills
spec-engine update

# Update specific skill
spec-engine update maersk-figma-agent
```

---

## Extension Points

### Adding a New Source

1. Create new directory in `src/sources/`
2. Implement `SkillSource` interface
3. Register in source factory
4. Add authentication logic
5. Add tests

Example: `src/sources/gitlab/gitlab-source.ts`

### Adding a New Registry

1. Create new registry client
2. Implement `RegistryProvider` interface
3. Register in registry manager
4. Add authentication support
5. Add tests

Example: `src/registry/custom-registry-provider.ts`

### Adding a New IDE

1. Create new directory in `src/adapters/`
2. Implement `IDEAdapter` interface
3. Add IDE-specific transformation logic
4. Register in adapter factory
5. Add detection logic
6. Add tests

Example: `src/adapters/vscode/vscode-adapter.ts`

---

## Error Handling

### Error Categories

1. **User Errors**: Invalid spec, missing files
   - Show helpful error message
   - Suggest fixes
   - Exit with code 1

2. **Network Errors**: Failed downloads, timeouts
   - Retry with exponential backoff
   - Fall back to cache if available
   - Exit with code 2

3. **System Errors**: Permission denied, disk full
   - Show system-level error
   - Suggest remediation
   - Exit with code 3

4. **IDE Errors**: IDE not detected, incompatible version
   - Show IDE-specific guidance
   - Suggest installation steps
   - Exit with code 4

### Rollback Strategy

- Keep previous state before applying
- On error, restore previous configuration
- Show diff of changes rolled back
- Log for debugging

---

## Performance Considerations

1. **Parallel Downloads**: Fetch independent skills concurrently
2. **Caching**: Content-addressable cache (like Git)
3. **Incremental Apply**: Only update changed skills
4. **Lock File**: Skip resolution if lock is up-to-date
5. **Lazy Loading**: Load adapters/sources only when needed

---

## Security Considerations

1. **Checksum Verification**: Verify SHA-256 of all downloads
2. **HTTPS Only**: All registry/source communication over TLS
3. **Token Management**: Store tokens securely (OS keychain)
4. **Sandboxing**: Skills cannot execute arbitrary code during install
5. **Audit Log**: Log all installations and changes

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
5. **Migration Tool**: Migrate from manual setup to spec-engine
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

This architecture provides a solid foundation that's:
- ✅ **Extensible**: Easy to add new sources/IDEs/registries
- ✅ **Testable**: Clear boundaries, mockable interfaces
- ✅ **Maintainable**: Single responsibility, loose coupling
- ✅ **Scalable**: Can handle large skill catalogs
- ✅ **User-Friendly**: Clear error messages, rich CLI UX
