# Ai Stack Kit - Visual Diagrams

This document contains ASCII diagrams for various aspects of the Ai Stack Kit architecture.

---

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                             │
│                                                                       │
│  $ aistack init                                                  │
│  $ aistack install                                               │
│  $ aistack apply                                                 │
│  $ aistack sync                                                  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           CLI LAYER                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Commands: init, install, apply, sync, validate, search, etc.  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  UI Components: spinner, logger, prompts, tables, colors       │ │
│  └────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          CORE LAYER                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      Core Engine                                │ │
│  │  Orchestrates: parse → resolve → fetch → transform → apply     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────┐  ┌────────────────────────────────────┐  │
│  │   Spec Parser        │  │        Resolver                    │  │
│  │  - Parse spec.yaml   │  │  - Build dependency graph          │  │
│  │  - Validate schema   │  │  - Resolve versions                │  │
│  │  - Type checking     │  │  - Topological sort                │  │
│  └──────────────────────┘  └────────────────────────────────────┘  │
└────┬──────────────┬──────────────────┬──────────────────┬──────────┘
     │              │                  │                  │
     │              │                  │                  │
     ▼              ▼                  ▼                  ▼
┌─────────┐  ┌─────────┐  ┌───────────────┐  ┌─────────────────┐
│ SOURCES │  │REGISTRY │  │   ADAPTERS    │  │    STORAGE      │
│         │  │         │  │               │  │                 │
│ ┌─────┐ │  │ ┌─────┐ │  │ ┌───────────┐ │  │ ┌─────────────┐ │
│ │GHub │ │  │ │Mgr  │ │  │ │  Cursor   │ │  │ │   Cache     │ │
│ └─────┘ │  │ └─────┘ │  │ │  Adapter  │ │  │ │   Manager   │ │
│ ┌─────┐ │  │ ┌─────┐ │  │ └───────────┘ │  │ └─────────────┘ │
│ │ npm │ │  │ │Cache│ │  │ ┌───────────┐ │  │ ┌─────────────┐ │
│ └─────┘ │  │ └─────┘ │  │ │  VSCode   │ │  │ │    State    │ │
│ ┌─────┐ │  │ ┌─────┐ │  │ │  Adapter  │ │  │ │   Manager   │ │
│ │Reg  │ │  │ │Auth │ │  │ └───────────┘ │  │ └─────────────┘ │
│ └─────┘ │  │ └─────┘ │  │ ┌───────────┐ │  │ ┌─────────────┐ │
│ ┌─────┐ │  │         │  │ │  Future   │ │  │ │  Lock File  │ │
│ │Local│ │  │         │  │ │  (IntelliJ│ │  │ │   Manager   │ │
│ └─────┘ │  │         │  │ │  Sublime) │ │  │ └─────────────┘ │
└─────────┘  └─────────┘  │ └───────────┘ │  └─────────────────┘
     │              │      └───────────────┘           │
     └──────────────┴──────────────┬──────────────────┘
                                   │
                                   ▼
                         ┌─────────────────┐
                         │     UTILS       │
                         │  fs, git,       │
                         │  semver, hash,  │
                         │  validation     │
                         └─────────────────┘
```

---

## 2. Data Flow: Install → Apply (Detailed)

```
┌──────────────┐
│  spec.yaml   │
│              │
│ version: 1.0 │
│ ide: cursor  │
│ skills: [...] │
└──────┬───────┘
       │
       │ 1. Read
       ▼
┌─────────────────────┐
│   Spec Parser       │
│  - Parse YAML       │
│  - Validate schema  │
│  - Type check       │
└──────┬──────────────┘
       │
       │ 2. Valid spec
       ▼
┌─────────────────────────┐     ┌──────────────────┐
│    Dependency Resolver   │────▶│  Query Registry  │
│  - Extract skill refs    │     │  - Get versions  │
│  - Build graph           │◀────│  - Get metadata  │
│  - Detect conflicts      │     └──────────────────┘
│  - Topological sort      │
└──────┬──────────────────┘
       │
       │ 3. Resolved skills
       ▼
┌─────────────────────────────────────────┐
│           Skill Fetcher                 │
│  Parallel fetch from sources            │
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐│
│  │ GitHub  │  │   npm   │  │ Registry││
│  │ Source  │  │ Source  │  │ Source  ││
│  └────┬────┘  └────┬────┘  └────┬────┘│
│       │            │            │     │
│       └────────────┴────────────┘     │
└───────────────────┬────────────────────┘
                    │
                    │ 4. Skill content
                    ▼
┌─────────────────────────────────────────┐
│       Checksum Verifier                 │
│  - Verify SHA-256                       │
│  - Ensure integrity                     │
└───────────────────┬─────────────────────┘
                    │
                    │ 5. Verified skills
                    ▼
┌─────────────────────────────────────────┐
│         Cache Manager                   │
│  - Store in content-addressable cache   │
│  - Index by checksum                    │
└───────────────────┬─────────────────────┘
                    │
                    │ 6. Cached
                    ▼
┌─────────────────────────────────────────┐
│        Lock File Writer                 │
│  - Write .aistack/lock.yaml         │
│  - Record exact versions + checksums    │
└───────────────────┬─────────────────────┘
                    │
                    │ 7. Lock created
                    ▼
┌─────────────────────────────────────────┐
│         IDE Detector                    │
│  - Detect IDE type                      │
│  - Find config paths                    │
│  - Validate environment                 │
└───────────────────┬─────────────────────┘
                    │
                    │ 8. IDE detected
                    ▼
┌─────────────────────────────────────────┐
│          IDE Adapter                    │
│  (Cursor, VSCode, etc.)                 │
│                                         │
│  - Transform skills to IDE format       │
│  - Resolve IDE-specific paths           │
│  - Merge with existing config           │
└───────────────────┬─────────────────────┘
                    │
                    │ 9. Transformed
                    ▼
┌─────────────────────────────────────────┐
│        File Writer                      │
│  - Write to IDE config directory        │
│  - Update IDE files                     │
│  - Set permissions                      │
└───────────────────┬─────────────────────┘
                    │
                    │ 10. Written
                    ▼
┌─────────────────────────────────────────┐
│       State Manager                     │
│  - Update installation state            │
│  - Record applied skills                │
│  - Store metadata                       │
└───────────────────┬─────────────────────┘
                    │
                    │ 11. Complete
                    ▼
              ┌──────────┐
              │ SUCCESS! │
              └──────────┘
```

---

## 3. Module Dependency Graph

```
                    ┌─────────────┐
                    │     CLI     │
                    └──────┬──────┘
                           │
                           │ depends on
                           │
                           ▼
                    ┌─────────────┐
                    │    CORE     │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
    ┌──────────────┐ ┌──────────┐ ┌──────────────┐
    │   SOURCES    │ │ REGISTRY │ │   ADAPTERS   │
    └──────┬───────┘ └────┬─────┘ └──────┬───────┘
           │              │              │
           └──────────────┼──────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   STORAGE   │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │    UTILS    │
                   └─────────────┘

Rules:
✅ Top layers can depend on lower layers
✅ Same-level modules are independent
❌ Lower layers cannot depend on upper layers
❌ No circular dependencies
```

---

## 4. Interface Interaction Diagram

```
┌──────────────────────────────────────────────────────┐
│                   Core Engine                        │
│                                                      │
│  Uses interfaces (NOT concrete classes):            │
│  - SkillSource                                       │
│  - RegistryProvider                                  │
│  - IDEAdapter                                        │
└───────────┬─────────────┬─────────────┬──────────────┘
            │             │             │
            │             │             │
   implements    implements     implements
            │             │             │
            ▼             ▼             ▼
┌─────────────────┐  ┌────────────┐  ┌─────────────┐
│  SkillSource    │  │ Registry   │  │ IDEAdapter  │
│  Interface      │  │ Provider   │  │ Interface   │
└────┬────────────┘  │ Interface  │  └──────┬──────┘
     │               └─────┬──────┘         │
     │                     │                │
     │ ┌───────────────────┼────────────────┘
     │ │                   │
     ▼ ▼                   ▼
┌──────────┐          ┌──────────┐
│ GitHub   │          │ Cursor   │
│ Source   │          │ Adapter  │
├──────────┤          ├──────────┤
│ npm      │          │ VSCode   │
│ Source   │          │ Adapter  │
├──────────┤          ├──────────┤
│ Registry │          │ IntelliJ │
│ Source   │          │ Adapter  │
├──────────┤          │ (future) │
│ Local    │          └──────────┘
│ Source   │
└──────────┘

Key Benefit: Core Engine is decoupled from implementations.
New sources/adapters can be added without modifying core.
```

---

## 5. Skill Resolution Flow

```
spec.yaml
────────────────────────────
skills:
  - name: skill-a
    version: ^1.0.0
  - name: skill-b
    version: ~2.1.0
────────────────────────────
         │
         ▼
    ┌─────────┐
    │ Resolver│
    └────┬────┘
         │
         ▼
  ┌────────────────┐
  │ Query Registry │
  │ for versions   │
  └────┬───────────┘
       │
       ▼
  skill-a: 1.0.0, 1.1.0, 1.2.3, 2.0.0
  skill-b: 2.0.5, 2.1.0, 2.1.8, 2.2.0
       │
       ▼
  ┌──────────────────┐
  │ Resolve ranges   │
  │ ^1.0.0 → 1.2.3   │
  │ ~2.1.0 → 2.1.8   │
  └────┬─────────────┘
       │
       ▼
  ┌──────────────────────┐
  │ Check dependencies   │
  │ skill-a needs skill-c│
  │ skill-b needs skill-d│
  └────┬─────────────────┘
       │
       ▼
  ┌──────────────────────┐
  │ Build graph          │
  │                      │
  │     skill-c          │
  │       ↑              │
  │       │              │
  │    skill-a  skill-d  │
  │       ↑       ↑      │
  │       │       │      │
  │       └───┬───┘      │
  │          root        │
  └────┬─────────────────┘
       │
       ▼
  ┌──────────────────────┐
  │ Topological sort     │
  │ [skill-c, skill-d,   │
  │  skill-a, skill-b]   │
  └────┬─────────────────┘
       │
       ▼
  Install in order
```

---

## 6. Adapter Transformation Flow

```
┌──────────────────────────────────┐
│      Skill Content               │
│                                  │
│  files:                          │
│    - SKILL.md                    │
│    - config.json                 │
│    - assets/icon.png             │
│                                  │
│  manifest:                       │
│    name: "my-skill"              │
│    version: "1.0.0"              │
│    features: ["skills", "rules"] │
└────────────┬─────────────────────┘
             │
             ▼
     ┌───────────────┐
     │ IDE Adapter   │
     │  (Cursor)     │
     └───────┬───────┘
             │
             ▼
     ┌──────────────────────┐
     │ Detect IDE Features  │
     │ - skills? ✅         │
     │ - rules? ✅          │
     │ - hooks? ✅          │
     └────────┬─────────────┘
              │
              ▼
     ┌──────────────────────┐
     │ Transform Files      │
     │                      │
     │ SKILL.md →           │
     │   ~/.cursor/skills/  │
     │   my-skill/SKILL.md  │
     │                      │
     │ config.json →        │
     │   ~/.cursor/skills/  │
     │   my-skill/config    │
     │                      │
     │ assets/icon.png →    │
     │   ~/.cursor/skills/  │
     │   my-skill/assets/   │
     └────────┬─────────────┘
              │
              ▼
     ┌──────────────────────┐
     │ Write Files          │
     │ - Create dirs        │
     │ - Copy content       │
     │ - Set permissions    │
     └────────┬─────────────┘
              │
              ▼
     ┌──────────────────────┐
     │ Update Metadata      │
     │ - Record install     │
     │ - Save paths         │
     └──────────────────────┘
```

---

## 7. Error Handling Flow

```
                ┌──────────────┐
                │  Operation   │
                └──────┬───────┘
                       │
                  ┌────▼─────┐
                  │   Try    │
                  └────┬─────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
    ┌─────────┐               ┌───────────┐
    │ Success │               │  Error    │
    └─────────┘               └─────┬─────┘
                                    │
                         ┌──────────┼──────────┐
                         │          │          │
                         ▼          ▼          ▼
                  ┌───────────┐ ┌───────┐ ┌────────┐
                  │ User Error│ │Network│ │System  │
                  │ (code 1)  │ │Error  │ │Error   │
                  └─────┬─────┘ │(code 2│ │(code 3)│
                        │       └───┬───┘ └────┬───┘
                        │           │          │
                        ▼           ▼          ▼
                  ┌────────────────────────────────┐
                  │    Error Handler               │
                  └────┬──────────────┬─────────────┘
                       │              │
                  ┌────▼────┐   ┌────▼──────┐
                  │ Show    │   │ Rollback  │
                  │ Message │   │ Changes   │
                  └────┬────┘   └────┬──────┘
                       │              │
                       └──────┬───────┘
                              │
                              ▼
                       ┌──────────┐
                       │   Exit   │
                       │ with code│
                       └──────────┘
```

---

## 8. Cache Architecture

```
┌───────────────────────────────────────────────┐
│         Content-Addressable Cache             │
│                                               │
│  ~/.aistack/cache/                        │
│                                               │
│  objects/                                     │
│    ├── ab/                                    │
│    │   └── cdef123... (skill content)         │
│    ├── 12/                                    │
│    │   └── 3456abc... (skill content)         │
│    └── ...                                    │
│                                               │
│  index.json                                   │
│    {                                          │
│      "skill-a@1.0.0": "abcdef123...",         │
│      "skill-b@2.1.0": "123456abc...",         │
│      ...                                      │
│    }                                          │
│                                               │
│  Lookup: O(1) by checksum                    │
│  Storage: Deduplicated by content            │
└───────────────────────────────────────────────┘

When fetching skill:
  1. Compute checksum from metadata
  2. Check cache index
  3. If hit: return from objects/
  4. If miss: fetch from source, cache, return
```

---

## 9. Security Model

```
┌─────────────────────────────────────────────┐
│              Security Layers                │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Layer 1: Network Security                  │
│  - HTTPS/TLS only                           │
│  - Certificate verification                 │
│  - No plaintext credentials                 │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Layer 2: Authentication                    │
│  - Token-based auth                         │
│  - OS keychain integration                  │
│  - Per-source credentials                   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Layer 3: Content Verification              │
│  - SHA-256 checksums                        │
│  - Compare with lock file                   │
│  - Reject on mismatch                       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Layer 4: Safe Installation                 │
│  - No code execution during install         │
│  - Sandboxed file operations                │
│  - Permission checks                        │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Layer 5: Audit Trail                       │
│  - Log all operations                       │
│  - Track installations                      │
│  - Detect tampering                         │
└─────────────────────────────────────────────┘
```

---

## 10. Extension Points Diagram

```
┌────────────────────────────────────────────┐
│          Extension Points                  │
└────────────────────────────────────────────┘

Add New Source:
───────────────
┌──────────────┐
│ SkillSource  │ ← Implement this interface
│  Interface   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Your Source  │
│ (GitLab,     │
│  Bitbucket,  │
│  S3, etc.)   │
└──────────────┘

Add New IDE:
────────────
┌──────────────┐
│ IDEAdapter   │ ← Implement this interface
│  Interface   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Your Adapter │
│ (IntelliJ,   │
│  Sublime,    │
│  Vim, etc.)  │
└──────────────┘

Add New Registry:
─────────────────
┌──────────────────┐
│ RegistryProvider │ ← Implement this interface
│    Interface     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Your Registry    │
│ (Artifactory,    │
│  Private, etc.)  │
└──────────────────┘

All extensions register with Core Engine.
No core code modification needed!
```

---

These diagrams provide visual representations of the architecture's key concepts, making it easier to understand the system's structure and behavior.
