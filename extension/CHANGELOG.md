# Change Log

All notable changes to the **AI Stack Kit** VS Code extension are documented here.

## [1.1.9] - 2026-05-18

### Changed

- **Catalog webview** — removed redundant “Full skill browser” link; the hosted site opens only from the **globe** on the Catalog title bar. **Show Catalog Panel** focuses the in-sidebar catalog (search, Add to spec).

### Fixed

- **Activity Bar** — grayscale chevron logo (16×16 PNG from official artwork); complex SVG icons no longer used so the **AI Stack Kit** icon registers on the Activity Bar instead of views appearing only under Explorer.
- **Show Sidebar** (`aistack.showSidebar`) — focuses the AI Stack Kit view container.
- **Show Catalog Panel** — uses `WebviewView.show()` with retries and `workbench.action.openView` fallback when `aistack.catalog.focus` is unavailable.

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
