# Spec Engine - Architecture Overview

## System Architecture Diagram

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

## Data Flow Diagram

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
│  Resolve Skills │────▶│ Query        │
│  & Dependencies │     │ Registries   │
└────┬────────────┘     └──────────────┘
     │
     ▼
┌─────────────────┐
│ Build Dependency│
│     Graph       │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Topological    │
│     Sort        │
└────┬────────────┘
     │
     ▼
┌─────────────────┐     ┌──────────────┐
│  Fetch Skills   │────▶│ Skill Sources│
│   (parallel)    │     │ (GitHub, npm)│
└────┬────────────┘     └──────────────┘
     │
     ▼
┌─────────────────┐
│ Verify Checksums│
└────┬────────────┘
     │
     ▼
┌─────────────────┐     ┌──────────────┐
│  Cache Skills   │────▶│ Local Storage│
└────┬────────────┘     └──────────────┘
     │
     ▼
┌─────────────────┐
│  Write Lock File│
└────┬────────────┘
     │
     ▼
┌─────────────────┐     ┌──────────────┐
│   Apply to IDE  │────▶│ IDE Adapter  │
│  (transform)    │     │  (Cursor)    │
└────┬────────────┘     └──────────────┘
     │
     ▼
┌─────────────────┐
│ Update IDE State│
└─────────────────┘
```

## Dependency Boundaries

### Layer Dependencies (Allowed → Dependencies)

```
CLI
 └─→ Core
      ├─→ Sources
      ├─→ Registry
      ├─→ Adapters
      ├─→ Storage
      └─→ Utils

Sources
 └─→ Utils

Registry
 └─→ Utils

Adapters
 └─→ Utils

Storage
 └─→ Utils

Utils
 └─→ (no dependencies)
```

### Critical Rules

1. **No Circular Dependencies**: Each layer can only depend on layers below
2. **No Cross-Talk**: Sources ↔ Adapters ↔ Registry never communicate directly
3. **Core Orchestrates**: All coordination happens in Core Engine
4. **Utils are Pure**: No business logic, no side effects beyond I/O

### Interface Boundaries

```
┌─────────────────────────────────────────┐
│            Core Engine                  │
│                                         │
│  Uses interfaces:                       │
│  - SkillSource                          │
│  - RegistryProvider                     │
│  - IDEAdapter                           │
│                                         │
│  Does NOT import concrete classes       │
└─────────────────────────────────────────┘
           ▲         ▲         ▲
           │         │         │
    ┌──────┘    ┌────┘    └────┐
    │           │              │
┌───┴───┐  ┌───┴────┐  ┌──────┴───┐
│GitHub │  │Registry│  │  Cursor  │
│Source │  │Provider│  │ Adapter  │
└───────┘  └────────┘  └──────────┘
```

## Module Responsibilities Summary

| Layer | Module | Responsibility | Key Interfaces |
|-------|--------|----------------|----------------|
| **CLI** | Commands | User interaction, routing | - |
| | UI | Terminal output, spinners | - |
| **Core** | Engine | Orchestration, lifecycle | Uses all interfaces |
| | Spec Parser | Parse/validate spec.yaml | SpecFile |
| | Resolver | Dependency resolution | - |
| **Sources** | GitHub | Fetch from GitHub repos | SkillSource |
| | npm | Fetch from npm packages | SkillSource |
| | Registry | Fetch from registries | SkillSource |
| | Local | Fetch from local files | SkillSource |
| **Registry** | Manager | Registry operations | RegistryProvider |
| | Cache | Registry query cache | - |
| | Auth | Token management | - |
| **Adapters** | Cursor | Apply to Cursor IDE | IDEAdapter |
| | VSCode | Apply to VSCode IDE | IDEAdapter |
| **Storage** | Cache | Skill content cache | - |
| | State | Installation state | - |
| **Utils** | fs, git, etc. | Shared utilities | - |

## Extension Points

### Adding a New Source (e.g., GitLab)

1. Create `src/sources/gitlab/gitlab-source.ts`
2. Implement `SkillSource` interface
3. Register in source factory
4. Add to spec.yaml schema

**Files to modify:**
- `src/sources/gitlab/gitlab-source.ts` (new)
- `src/core/engine/engine.ts` (register source)
- `config/schema.json` (add 'gitlab' to source types)

### Adding a New IDE (e.g., IntelliJ)

1. Create `src/adapters/intellij/intellij-adapter.ts`
2. Implement `IDEAdapter` interface
3. Add detection logic
4. Register in adapter factory

**Files to modify:**
- `src/adapters/intellij/intellij-adapter.ts` (new)
- `src/adapters/factory.ts` (register adapter)
- `config/schema.json` (add 'intellij' to IDE types)

### Adding a New Registry

1. Create registry client
2. Implement `RegistryProvider` interface
3. Add to registry manager

**Files to modify:**
- `src/registry/custom-registry.ts` (new)
- `src/registry/manager.ts` (register provider)

## Key Design Patterns

1. **Strategy Pattern**: Pluggable sources, adapters, registries
2. **Factory Pattern**: Create sources/adapters based on config
3. **Repository Pattern**: Storage layer abstracts persistence
4. **Facade Pattern**: Core Engine simplifies complex subsystems
5. **Template Method**: BaseSkillSource, BaseIDEAdapter provide common logic

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Parse spec.yaml | O(n) | Linear in file size |
| Resolve dependencies | O(n + e) | Graph traversal (n=skills, e=dependencies) |
| Fetch skills | O(n) | Parallel downloads (n=skills) |
| Apply skills | O(n × m) | n=skills, m=files per skill |
| Cache lookup | O(1) | Hash-based lookup |

## Security Model

```
┌────────────────────────────────────────┐
│         Security Boundaries            │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  Network Layer (HTTPS only)      │ │
│  │  - TLS/SSL verification          │ │
│  │  - Certificate pinning (opt)     │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  Authentication                  │ │
│  │  - Token-based auth              │ │
│  │  - OS keychain integration       │ │
│  │  - No plaintext credentials      │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  Content Verification            │ │
│  │  - SHA-256 checksums             │ │
│  │  - Signature verification (opt)  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  Sandboxing                      │ │
│  │  - No code execution in install  │ │
│  │  - Safe file operations          │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

## CLI Command Reference

```bash
# Initialize new project
spec-engine init [--template <template-name>]

# Install skills from spec.yaml
spec-engine install [--offline] [--force]

# Apply skills to IDE
spec-engine apply [--ide <ide-type>] [--dry-run]

# Sync (install + apply)
spec-engine sync

# Validate spec.yaml
spec-engine validate [--strict]

# Show status
spec-engine status [--verbose]

# Search registries
spec-engine search <query> [--registry <name>]

# Add skill to spec.yaml
spec-engine add <skill-reference> [--save-dev]

# Remove skill from spec.yaml
spec-engine remove <skill-name>

# Update skills
spec-engine update [skill-name] [--latest]

# List installed skills
spec-engine list [--tree]

# Show skill info
spec-engine info <skill-name>

# Publish skill to registry
spec-engine publish [--tag <tag>] [--registry <name>]

# Login to registry
spec-engine login [--registry <name>]

# Logout from registry
spec-engine logout [--registry <name>]

# Clean cache
spec-engine clean [--cache] [--all]
```

## Configuration Precedence

```
Environment Variables
        ↓
  (override)
        ↓
Global Config (~/.spec-engine/config.yaml)
        ↓
  (override)
        ↓
Project Config (spec.yaml)
        ↓
  (override)
        ↓
CLI Flags (--flag value)
```

## Error Handling Strategy

```typescript
// Error categories with exit codes
enum ErrorCode {
  USER_ERROR = 1,        // Invalid spec, missing files
  NETWORK_ERROR = 2,     // Failed downloads, timeouts
  SYSTEM_ERROR = 3,      // Permission denied, disk full
  IDE_ERROR = 4,         // IDE not found, version mismatch
  REGISTRY_ERROR = 5,    // Registry unavailable
  CONFLICT_ERROR = 6,    // Dependency conflicts
}

// Error handling flow
try {
  await operation();
} catch (error) {
  if (error instanceof UserError) {
    showHelpfulErrorWithSuggestions();
    exitWithCode(ErrorCode.USER_ERROR);
  } else if (error instanceof NetworkError && hasCachedData()) {
    logger.warn('Using cached data');
    continueWithCache();
  } else {
    rollbackChanges();
    exitWithCode(getErrorCode(error));
  }
}
```

---

## Summary

This architecture provides:

✅ **Modularity**: Each component has a single, well-defined responsibility  
✅ **Extensibility**: Easy to add new sources, IDEs, registries  
✅ **Testability**: Clear interfaces enable mocking and isolation  
✅ **Maintainability**: Loose coupling, clear boundaries  
✅ **Scalability**: Parallel operations, caching, incremental updates  
✅ **Security**: Checksums, HTTPS, token management  
✅ **User Experience**: Rich CLI, helpful errors, predictable behavior  

The design follows established patterns from npm, Terraform, and kubectl while being tailored to the specific needs of managing IDE skills/subagents across multiple sources and targets.
