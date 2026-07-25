# Change Log

All notable changes to the **AI Stack Kit** VS Code extension are documented here.

## [1.3.6] - 2026-07-03

### Changed

- **Pass-through module install** — skills, subagents, and hooks are copied from source as authored (no auto-generated prompts or agent stubs).
- **Faster sync** — parallel module fetch/install, GitHub tarball caching for shared repos, parallel project + profile sync, and parallel adapter file writes.
- **Profile installs** — auto-sync after catalog add, watcher on `~/.aistack/spec.yaml`, and proactive creation of client `skills/`, `agents/`, and `hooks/` directories on first user-scope sync.

### Fixed

- Profile-level skill installs now materialize under `~/.cursor/skills/` (and Claude/Copilot equivalents) even when those folders did not exist before.

## [1.3.5] - 2026-05-24

### Changed

- Version bump for the Open VSX / Marketplace package after `1.3.4` was already used.

## [1.3.4] - 2026-05-24

### Changed

- Version bump for the Open VSX / Marketplace for README changes

## [1.3.3] - 2026-05-24

### Changed

- Version bump for the Open VSX / Marketplace package after `1.3.2` was already used.

## [1.3.2] - 2026-05-23

### Docs

- Refreshed the extension README with clearer developer-focused positioning, tighter install copy, and a cleaner **Project vs Profile** explanation for Cursor / VS Code users.

### Fixed

- **First sync after adding a skill** — overlapping sync triggers now queue a follow-up run instead of collapsing into the already-running sync, so VS Code/Cursor creates the client skill folders on the first visible Sync action.
- **Extension test runner on macOS** — fixed local integration test launch when the VS Code app path contains spaces.

## [1.3.1] - 2026-05-23

### Added

- **Cursor / Open VSX distribution** — release workflow now publishes the same VSIX to the [Open VSX Registry](https://open-vsx.org/extension/deb-adarsh/ai-stack-kit) in addition to the Visual Studio Marketplace, so the extension is installable from Cursor's Extensions panel (and any VSCodium-family IDE) instead of requiring a manual VSIX install.
- **`publish:openvsx` / `publish:all` npm scripts** for local publishing once the `OVSX_PAT` is in your environment.

### Docs

- Install instructions updated for Cursor users (search the Extensions panel, no `.vsix` download).
- New `docs/RELEASING.md` documenting the one-time Open VSX namespace claim and token setup.

## [1.3.0] - 2026-05-22

### Added

- **Dual-scope catalog add** — **Add to project** (repo `spec.yaml`) and **Add to profile** (`~/.aistack/spec.yaml`) in the Catalog webview.
- **Modules tree** — **Project** and **Profile** groups for modules from each spec, with hover tooltips explaining repo-local vs user-global scope and where files land on disk.
- **Catalog buttons** — hover tooltips clarify that **Add to project** writes inside the repo and **Add to profile** installs globally for your user account.
- **Sync / Doctor / Outputs** — apply and health checks for both project and profile specs when present.
- **Open spec.yaml** — choose project or profile spec when both exist.

### Changed

- **Search Catalog…** — prompts for project vs profile target before adding.
- **README / extension guide** — clarified that **Add to profile** installs at the user-global level (`~/.cursor`, `~/.copilot`, `~/.claude`) across every project on the machine.

### Fixed

- **Concurrent sync race** — overlapping sync triggers (status bar click + autoSyncOnSave from the spec watcher) now collapse into one run instead of racing on disk writes. Eliminates the "had to sync multiple times" symptom.
- **`.vscode/settings.json` corruption** — JSON merge now understands JSONC (`//`, `/* */`, trailing commas) so syncs no longer write `<<<<<<< AISTACK_CONFLICT` markers into user settings. Existing keys are preserved on merge.
- **Safer conflict handling for non-text files** — when an existing file differs and is not Markdown/text, sync now reports a conflict in the AI Stack Kit output channel instead of overwriting it with conflict markers.
- **Conflict warnings surfaced** — Sync now shows a warning toast (and reveals the output channel) when the apply pipeline records conflicts, instead of silently succeeding.

## [1.2.2] - 2026-05-18

### Changed

- **Marketplace categories** — `Machine Learning`, `Data Science`, `Other` (official values); AI-related terms in `keywords` (`ai skills`, `agentic programming`, etc.).

## [1.2.1] - 2026-05-18

### Changed

- **Activity Bar icon** — two minimal chevron blocks (single-path SVG).

## [1.2.0] - 2026-05-18

### Fixed

- **Activity Bar icon and container** — restored a single minimal SVG (`media/activity-bar.svg`) so **AI Stack Kit** appears on the Activity Bar (light/dark PNG pairs prevented registration on some hosts).

### Changed

- **Marketplace description** — IDE-focused copy (no `spec.yaml` in the short summary).
- **Catalog webview** — removed redundant “Full skill browser” link; hosted site opens only from the **globe** on the Catalog title bar.
- **Show Sidebar** (`aistack.showSidebar`) and **Show Catalog Panel** — reliable sidebar/catalog focus with `WebviewView.show()` and fallbacks.

## [1.1.8] - 2026-05-18

### Changed

- **Branding** — Marketplace icon and web favicon use `assets/logo-transparent.svg` (official artwork); PNGs and Activity Bar icons regenerated from that SVG. `assets/logo.svg` for white-background use.

## [1.1.7] - 2026-05-18

### Fixed

- **Extension not loading (1.1.6 regression)** — removed overly narrow `activationEvents` so commands and the Activity Bar work on install (VS Code auto-activates from contributed views/commands).
- **Missing Activity Bar icon** — single compliant `activity-bar-icon.svg` instead of theme-specific SVG pair that failed on some hosts.

## [1.1.6] - 2026-05-18

### Fixed

- **Activity Bar view order** default is now Modules → Catalog → Outputs.
- **Globe (skill browser) button** opens the hosted [skill browser](https://deb-adarsh.github.io/ai-stack-kit/) in your browser instead of re-focusing the sidebar.
- **Show Catalog** command reveals the AI Stack Kit sidebar and Catalog panel reliably.

## [1.1.5] - 2026-05-18

### Fixed

- **Activity Bar icon** uses separate light/dark SVGs (single-path, no `opacity`/`currentColor`) so VS Code renders stacked bars instead of a gray placeholder square.

## [1.1.4] - 2026-05-18

### Fixed

- **Activity Bar icon** now uses a theme-aware SVG (PNG was shown as a gray square).
- **Catalog search** loads the bundled `catalog.json` again (Vite build no longer deletes it; webview uses an injected URL).
- **Catalog UI** uses VS Code input colors, result counts, publisher badges, and broader search (publisher, catalog id).
- **Sync** shows an error notification when the pipeline fails instead of always reporting success.

## [1.1.3] - 2026-05-18

### Fixed

- **Initialize Workspace** no longer fails validation on an empty starter `spec.yaml` (`skills: []`).

## [1.1.2] - 2026-05-18

### Added

- Initial Marketplace release: Activity Bar views (Modules, Outputs, Catalog webview).
- Commands: Initialize, Sync, Doctor, Search/Add, Switch Client, Refresh Catalog.
- Settings for client type, install scope, GitHub token, dry-run, and auto-sync on save.
- Getting-started walkthrough.
- Integrated **Report Issue** flow (`Help → Report Issue`).
- Bundled catalog snapshot and headless `AistackWorkspace` sync engine.
