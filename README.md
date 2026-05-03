# Spec Engine

A CLI tool for managing IDE skills, subagents, and configurations across multiple sources and IDEs.

> Think: **npm** for IDE configurations + **Terraform** for declarative setup + **kubectl** for CLI UX

---

## Overview

Spec Engine allows you to:
- 📦 **Package** IDE skills (Cursor skills, rules, hooks) as reusable components
- 🔄 **Distribute** skills via GitHub, npm, custom registries, or local files
- 🎯 **Apply** skills to multiple IDEs (Cursor, VSCode, and more)
- 🔒 **Version** and lock dependencies like package managers
- 🚀 **Share** configurations across teams via `spec.yaml`

---

## Quick Start

```bash
# Install spec-engine
npm install -g spec-engine

# Initialize a new project
spec-engine init

# Edit spec.yaml to add skills
vim spec.yaml

# Install and apply skills
spec-engine sync
```

---

## Example `spec.yaml`

```yaml
version: "1.0"

ide:
  type: cursor
  features:
    - skills
    - rules
    - hooks

sources:
  - type: github
    name: official
    repository: spec-engine/skills
    auth: ${GITHUB_TOKEN}

skills:
  # From GitHub
  - source: github:official
    name: canvas
    version: ^2.0.0
  
  # From npm
  - source: npm:@spec-engine
    name: figma-agent
    version: latest
  
  # From local directory
  - source: local:workspace
    name: my-custom-skill
    path: ./skills/my-skill

hooks:
  postApply:
    - echo "Skills applied successfully!"
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
spec-engine/
├── src/
│   ├── cli/              # CLI commands and UI
│   ├── core/             # Engine, parser, resolver
│   ├── sources/          # GitHub, npm, registry, local
│   ├── registry/         # Registry management
│   ├── adapters/         # Cursor, VSCode adapters
│   ├── storage/          # Cache and state management
│   ├── utils/            # Shared utilities
│   └── types/            # TypeScript types
├── config/
│   ├── default.yaml      # Default configuration
│   └── schema.json       # spec.yaml JSON schema
├── templates/
│   └── spec.yaml         # Template spec file
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
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
Apply skills to different IDEs:
- **Cursor**: Skills, rules, hooks
- **VSCode**: Extensions, settings, snippets
- **Future**: IntelliJ, Sublime, etc.

### 4. Lifecycle Hooks
Run commands at different stages:
- `preInstall` / `postInstall`
- `preApply` / `postApply`
- `preSync` / `postSync`

### 5. Caching
- Content-addressable cache (like Git)
- Checksum verification
- Offline mode support

---

## Commands

```bash
# Project Management
spec-engine init                    # Initialize new project
spec-engine validate                # Validate spec.yaml
spec-engine status                  # Show installation status

# Skill Management
spec-engine install                 # Install skills (download)
spec-engine apply                   # Apply to IDE
spec-engine sync                    # Install + Apply
spec-engine update [skill]          # Update skills

# Discovery
spec-engine search <query>          # Search registries
spec-engine info <skill>            # Show skill details
spec-engine list                    # List installed skills

# Modification
spec-engine add <skill>             # Add skill to spec.yaml
spec-engine remove <skill>          # Remove skill

# Registry
spec-engine login                   # Login to registry
spec-engine publish                 # Publish skill

# Maintenance
spec-engine clean                   # Clean cache
```

---

## Documentation

### 📚 Architecture Documents

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Detailed architecture design
  - Folder structure
  - Module responsibilities
  - Interface definitions
  - Data flow diagrams
  - Dependency boundaries
  - Example configurations

- **[ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)**: High-level overview
  - System architecture diagram
  - Data flow visualization
  - Module summary
  - Extension points
  - CLI command reference

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
git clone https://github.com/spec-engine/spec-engine.git
cd spec-engine

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run CLI locally
npm link
spec-engine --help
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

## Extending Spec Engine

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

| Feature | Spec Engine | npm | Terraform | kubectl |
|---------|-------------|-----|-----------|---------|
| Declarative Config | ✅ | ❌ | ✅ | ✅ |
| Version Locking | ✅ | ✅ | ✅ | ❌ |
| Multiple Sources | ✅ | ⚠️ | ⚠️ | ❌ |
| IDE Agnostic | ✅ | ❌ | N/A | N/A |
| Dependency Resolution | ✅ | ✅ | ✅ | ❌ |
| Lifecycle Hooks | ✅ | ✅ | ✅ | ❌ |

---

## Roadmap

### Phase 1: Core (v0.1)
- [x] Architecture design
- [ ] Core engine implementation
- [ ] Spec parser and validator
- [ ] GitHub source
- [ ] Cursor adapter
- [ ] Basic CLI

### Phase 2: Extended Sources (v0.2)
- [ ] npm source
- [ ] Registry provider
- [ ] Local source
- [ ] Dependency resolver

### Phase 3: Extended IDEs (v0.3)
- [ ] VSCode adapter
- [ ] Multiple IDE support
- [ ] Backup/restore

### Phase 4: Registry (v0.4)
- [ ] Public registry server
- [ ] Search functionality
- [ ] Publishing support
- [ ] Private registries

### Phase 5: Advanced (v1.0)
- [ ] Watch mode
- [ ] Skill templates
- [ ] Web UI
- [ ] Team sync
- [ ] Analytics

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

## License

MIT © Spec Engine Team

---

## Support

- 📖 Documentation: [docs.spec-engine.dev](https://docs.spec-engine.dev)
- 💬 Discord: [discord.gg/spec-engine](https://discord.gg/spec-engine)
- 🐛 Issues: [GitHub Issues](https://github.com/spec-engine/spec-engine/issues)
- 📧 Email: support@spec-engine.dev

---

## Acknowledgments

Inspired by:
- **npm**: Registry abstraction and versioning
- **Terraform**: Declarative infrastructure
- **kubectl**: CLI user experience
- **Cursor**: IDE extensibility

Built with ❤️ for developers who want portable, reproducible IDE configurations.
