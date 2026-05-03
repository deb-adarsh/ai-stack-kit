# CLI UX Flow Examples

This document shows the exact user experience for each CLI command.

---

## `aistack init`

### Flow: Quick Init (with -y flag)

```bash
$ aistack init -y
✔ Detected client: Cursor
✔ Created spec.yaml
✔ Project initialized successfully!

Next steps:
  1. Review spec.yaml
  2. Run: aistack sync
```

### Flow: Interactive Init

```bash
$ aistack init
⠋ Initializing project...
✔ Detected client: Cursor

? Project name: my-cursor-setup
? Description: My Cursor IDE configuration with custom skills
? Author: John Doe

? Select client/IDE: 
❯ Cursor
  VS Code
  IntelliJ IDEA
  Neovim
  Other

⠋ Analyzing project...
✔ Found skill suggestions

Recommended skills for your project:

? Select skills to install: (Press <space> to select, <a> to toggle all, <i> to invert selection)
❯◉ react-expert - React development assistance
 ◉ typescript-helper - TypeScript coding assistance #typescript #helper
 ◯ test-generator - Generate unit tests #testing
 ◉ canvas - Create interactive visualizations #ui #viz ↓ 1.2M
 ◯ code-review - AI code review assistant #ai #review

? Enable auto-sync? No
? Verify checksums? Yes

⠋ Creating spec.yaml...
✔ Created spec.yaml

? Install skills now? Yes

⠋ Installing skills...
✔ Installed 3 skills

✓ Project initialized successfully!

Next steps:
  1. Review spec.yaml
  2. Run: aistack sync
```

---

## `aistack add`

### Flow: Add with skill name

```bash
$ aistack add canvas
⠋ Searching for canvas...
✔

canvas v2.1.0
Create interactive canvas visualizations in Cursor

┌─────────────┬──────────────────────────────────────────┐
│ Author      │ Cursor Team                              │
│ License     │ MIT                                      │
│ Repository  │ https://github.com/cursor/skills/canvas  │
│ Tags        │ canvas, visualization, react, ui         │
│ Clients     │ cursor, vscode                           │
│ Downloads   │ 1.2M                                     │
└─────────────┴──────────────────────────────────────────┘

? Add canvas? Yes

⠋ Fetching versions...
✔

? Select version for canvas:
❯ latest (2.1.0)
  ──────────
  2.1.0
  2.0.5
  2.0.4
  2.0.0
  1.9.0

? Configure skill now? No

⠋ Adding to spec.yaml...
✔ Added to spec.yaml

? Install now? Yes

⠋ Installing canvas...
✔ Installed canvas v2.1.0

✓ canvas added successfully!
```

### Flow: Interactive add (no skill name)

```bash
$ aistack add

Search for skills:
? Search: figma

⠋ Searching...
✔ Found 3 skills

? Select a skill:
❯ figma-agent v1.5.0 - Figma design integration #figma #design ↓ 50K
  figma-to-code v2.0.0 - Convert Figma to code #figma #code ↓ 30K
  figma-tokens v1.2.0 - Sync design tokens #figma #tokens ↓ 15K

[rest of flow same as above]
```

---

## `aistack search`

```bash
$ aistack search react

⠋ Searching...
✔ Found 5 skills

┌──────────────────┬─────────┬────────────────────────────────────────┬───────────┐
│ Name             │ Version │ Description                            │ Downloads │
├──────────────────┼─────────┼────────────────────────────────────────┼───────────┤
│ react-expert     │ 3.2.0   │ React development assistance           │ 500K      │
│ react-ui-builder │ 2.1.0   │ Build React UIs faster                 │ 250K      │
│ react-hooks      │ 1.8.0   │ Custom React hooks library             │ 180K      │
│ react-router     │ 2.0.0   │ React Router integration               │ 120K      │
│ react-query      │ 1.5.0   │ Data fetching with React Query         │ 90K       │
└──────────────────┴─────────┴────────────────────────────────────────┴───────────┘

Showing 5 results
Run aistack info <skill> for more details
```

### With filters

```bash
$ aistack search react --tag ui --client cursor

⠋ Searching...
✔ Found 2 skills

┌──────────────────┬─────────┬────────────────────────────────────────┬───────────┐
│ Name             │ Version │ Description                            │ Downloads │
├──────────────────┼─────────┼────────────────────────────────────────┼───────────┤
│ react-ui-builder │ 2.1.0   │ Build React UIs faster                 │ 250K      │
│ react-expert     │ 3.2.0   │ React development assistance           │ 500K      │
└──────────────────┴─────────┴────────────────────────────────────────┴───────────┘
```

---

## `aistack info`

```bash
$ aistack info canvas

⠋ Fetching info for canvas...
✔

canvas v2.1.0
Create interactive canvas visualizations in Cursor with React components

┌─────────────┬────────────────────────────────────────────────────┐
│ Author      │ Cursor Team                                        │
│ License     │ MIT                                                │
│ Repository  │ https://github.com/cursor-skills/canvas            │
│ Tags        │ canvas, visualization, react, ui, interactive      │
│ Clients     │ cursor, vscode                                     │
│ Downloads   │ 1.2M                                               │
└─────────────┴────────────────────────────────────────────────────┘

Dependencies:
  › react-skill@^1.0.0
```

---

## `aistack sync`

```bash
$ aistack sync

Syncing skills...

⠋ Validating spec.yaml...
✔ Spec validated

⠋ Installing skills...
✔ Installed 3 skills
  Skipped 1 (already installed)

⠋ Applying to client...
✔ Applied to client

✓ Sync complete!

Summary:
  ✓ Installed: 3
  ↑ Updated: 0
  ▶ Applied: 4
```

### With errors

```bash
$ aistack sync

Syncing skills...

⠋ Validating spec.yaml...
✔ Spec validated

⠋ Installing skills...
✘ Installation failed

✗ Errors:
  ✗ skills.0.version: Invalid version range "^abc"
  ✗ skills.2.name: Skill "invalid-skill" not found

Run: aistack validate
```

---

## `aistack status`

```bash
$ aistack status

✓ Spec: valid
✓ Client: Cursor (detected at ~/.cursor)
✓ Lock file: up to date

Installed skills: 4

┌──────────────────┬─────────┬──────────┬─────────────────────┐
│ Skill            │ Version │ Status   │ Last Updated        │
├──────────────────┼─────────┼──────────┼─────────────────────┤
│ canvas           │ 2.1.0   │ applied  │ 2026-05-02 12:30:45 │
│ react-expert     │ 3.2.0   │ applied  │ 2026-05-02 12:30:46 │
│ typescript-helper│ 2.0.5   │ applied  │ 2026-05-02 12:30:46 │
│ figma-agent      │ 1.5.0   │ pending  │ 2026-05-02 12:30:47 │
└──────────────────┴─────────┴──────────┴─────────────────────┘

Changes since last sync:
  + Added: figma-agent
  ↑ Updated: canvas (2.0.5 → 2.1.0)

Run: aistack sync
```

---

## `aistack list`

```bash
$ aistack list

Installed skills (4):

canvas@2.1.0
  Create interactive canvas visualizations
  Source: github:cursor-skills/canvas
  Applied: Yes

react-expert@3.2.0
  React development assistance
  Source: npm:@aistack/react-expert
  Applied: Yes

typescript-helper@2.0.5
  TypeScript coding assistance
  Source: registry:typescript-helper
  Applied: Yes

figma-agent@1.5.0
  Figma design integration
  Source: github:cursor-skills/figma-agent
  Applied: No
```

### Tree view

```bash
$ aistack list --tree

Installed skills (4):

├─ canvas@2.1.0
│  └─ react-skill@1.0.0
├─ react-expert@3.2.0
│  ├─ typescript-skill@2.0.0
│  └─ jsx-helper@1.5.0
├─ typescript-helper@2.0.5
└─ figma-agent@1.5.0
```

---

## `aistack validate`

### Success

```bash
$ aistack validate

⠋ Validating spec.yaml...
✔ Valid

✓ Spec is valid
```

### Errors

```bash
$ aistack validate

⠋ Validating spec.yaml...
✘ Validation failed:

✗ Validation failed:
  ✗ version: Required field missing
  ✗ skills.0.name: Must be at least 1 character
  ✗ skills.2.source: Must be one of: github, npm, registry, local
  ✗ client.type: Required field missing
```

---

## Error Handling Examples

### No spec.yaml found

```bash
$ aistack sync

✗ No spec.yaml found
Run: aistack init
```

### Network error

```bash
$ aistack add canvas

⠋ Searching for canvas...
✘

✗ Network error
Try: --offline flag
```

### Skill not found

```bash
$ aistack info nonexistent

⠋ Fetching info for nonexistent...
✘

✗ Skill "nonexistent" not found
```

---

## Advanced Features

### Dry run

```bash
$ aistack sync --dry-run

Syncing skills... (DRY RUN)

⠋ Validating spec.yaml...
✔ Spec validated

Would install:
  + canvas@2.1.0
  + react-expert@3.2.0
  + typescript-helper@2.0.5

Would apply to:
  Cursor (~/.cursor)

No changes made (dry run mode)
```

### Verbose mode

```bash
$ aistack sync -v

Syncing skills...

⠋ Validating spec.yaml...
  → Loading spec from: /Users/john/project/spec.yaml
  → Parsing YAML...
  → Validating schema...
  → All checks passed
✔ Spec validated

⠋ Installing skills...
  → Resolving canvas@latest...
  → Found version: 2.1.0
  → Downloading from: https://github.com/...
  → Verifying checksum: abc123...
  → Extracting files...
  → Installed to cache: ~/.aistack/cache/canvas-2.1.0
✔ Installed 1 skills

[... more verbose output ...]
```

---

This UX design provides:
- ✅ Clear progress indicators (spinners)
- ✅ Rich interactive prompts
- ✅ Beautiful tables and formatting
- ✅ Helpful error messages
- ✅ Multi-select with recommendations
- ✅ Search with filters
- ✅ Confirmation prompts
- ✅ Verbose mode for debugging
