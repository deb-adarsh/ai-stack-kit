# Contributing to AI Stack Kit

Thanks for helping grow an **open, aggregated view** of IDE/agent skills. Contributions aren’t only code—you can improve the **default catalog** everyone inherits on `aistack init` and that feeds the **hosted Skill browser**.

---

## Ways to contribute

- **Default catalog** — Add or fix entries in [`templates/sources.config.yaml`](./templates/sources.config.yaml) (see below).
- **Docs & README** — Clarify flows, fix links, improve onboarding.
- **CLI / adapters / web** — Bug fixes, UX, tests (follow existing patterns in `src/` and `web/`).
- **Issues** — Report confusing errors, stale docs, or sources that broke upstream.

Be respectful and assume good intent. For license-sensitive material, only propose **public upstreams** you’re allowed to link and fetch.

---

## Default catalog: `templates/sources.config.yaml`

This file is the **canonical default**:

| Consumer | How it’s used |
|----------|----------------|
| **`aistack init`** | Copied to the project as `sources.config.yaml` when that file is missing ([`ensureDefaultSourcesConfig`](./src/cli/commands.ts)). |
| **Skill browser CI** | [`scripts/build-catalog.mjs`](./scripts/build-catalog.mjs) sets `AISTACK_SOURCES_CONFIG` to this path and writes `web/public/catalog.json`. |
| **GitHub Pages workflow** | Same pipeline as local `npm run build:catalog` after TypeScript build. |

So a PR that **adds a source here** improves **new projects**, **search/add UX**, and (after merge + deploy) the **public browser**—without asking every user to edit YAML by hand.

Keep **[`examples/sources.config.yaml`](./examples/sources.config.yaml)** **in sync** with `templates/` (same `sources` list and top-level options). The example file is for docs and copy-paste; the template is what ships on init.

---

## Adding a **GitHub** tree source

Append under `sources:`:

```yaml
  - type: github
    id: my-org-skills           # stable id → registry names like my-org-skills--skill-folder
    repo: org/repo              # owner/name (public recommended)
    path: skills                # directory listing via GitHub Contents API; use "" for repo root
    branch: main                # ref for listing + raw fetches
```

**Requirements**

- **Public repo** (or document private access + `GITHUB_TOKEN` for maintainers—default catalog should stay public).
- Under `path`, the API must expose **directories** (and optionally `.md` skills) our connector understands—see [`github-tree-skills-provider.ts`](./src/registry/sources/github-tree-skills-provider.ts).
- **`id`** must stay **unique** among entries (slug: lowercase, hyphens).
- Prefer **upstream-maintained** trees with a clear license.

**Optional fields** (see schema in [`load-sources-config.ts`](./src/registry/sources/load-sources-config.ts)): `enrich`, `enrichMax`, `moduleType` (`skill` | `subagent` | `hook`).

---

## Adding an **npm** tree source

```yaml
  - type: npm
    id: my-npm-skills-bundle
    package: "@scope/skills-catalog"
    path: skills              # folder inside the published package tarball
    version: latest           # optional; dist-tag or range
    # registryUrl: https://registry.npmjs.org   # optional
```

Use when skills ship inside an npm package. Confirm the tarball layout matches `path`.

---

## Validate before you open a PR

From the repo root (Node 18+):

```bash
npm install
npm run build
npm run build:catalog
```

- Confirm **`build:catalog`** completes (GitHub API rate limits: set `GITHUB_TOKEN` locally if needed).
- Optionally **`npm run dev:web`** and spot-check filters / new rows.
- If you add a **new GitHub org** that should show a friendly label in the browser, extend the `publisherLabel` map in [`scripts/build-catalog.mjs`](./scripts/build-catalog.mjs) (then rebuild catalog).

---

## PR checklist (catalog changes)

- [ ] Updated [`templates/sources.config.yaml`](./templates/sources.config.yaml).
- [ ] Updated [`examples/sources.config.yaml`](./examples/sources.config.yaml) to match.
- [ ] Ran **`npm run build && npm run build:catalog`** successfully.
- [ ] Short PR description: upstream URL, why it’s valuable, license/public note.
- [ ] (If needed) **`publisherLabel`** / ecosystem mapping for the Skill browser.

---

## Local-only sources (not for default catalog)

Users can point **`sources.config.yaml`** at **private** repos or internal mirrors—that does **not** belong in the shared template unless project maintainers explicitly agree. Default catalog PRs should bias toward **broadly useful public upstreams**.

---

## Questions?

Open an issue with the repo URL you’d like to add and any concern (size, license, overlap). Maintainers can help choose an `id` and `path` before you invest time in a large PR.
