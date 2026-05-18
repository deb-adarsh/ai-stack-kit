# Change Log

All notable changes to the **AI Stack Kit** VS Code extension are documented here.

## [1.3.0] - 2026-05-18

### Added

- **Dual-scope catalog add** — **Add to project** (repo `spec.yaml`) and **Add to profile** (`~/.aistack/spec.yaml`) in the Catalog webview.
- **Modules tree** — **Project** and **Profile** groups for modules from each spec.
- **Sync / Doctor / Outputs** — apply and health checks for both project and profile specs when present.
- **Open spec.yaml** — choose project or profile spec when both exist.

### Changed

- **Search Catalog…** — prompts for project vs profile target before adding.

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
