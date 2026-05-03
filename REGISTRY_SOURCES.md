# Dynamic skill registry (sources, not rows)

The registry is an **aggregator** over configured **sources**. You add repositories or npm packages in `sources.config.yaml` — not individual skills in JSON.

## Configuration

- **Default path:** `./sources.config.yaml` (project root)  
- **Override:** `SPEC_ENGINE_SOURCES_CONFIG=/absolute/or/relative/path.yaml`

See [examples/sources.config.yaml](examples/sources.config.yaml) for **github/awesome-copilot** and **anthropics/skills** under `skills/`.

```yaml
version: 1
cacheTtlSeconds: 3600
cacheDir: .cache/spec-engine
githubMetadataEnrichMax: 120
githubMetadataEnrichConcurrency: 8

sources:
  - type: github
    id: awesome-copilot
    repo: github/awesome-copilot
    path: skills
    branch: main
```

| Field | Purpose |
|--------|---------|
| `cacheTtlSeconds` | Reuse cached listings until stale. |
| `cacheDir` | JSON caches (relative to cwd). |
| `githubMetadataEnrichMax` | Cap **raw.githubusercontent.com** fetches per GitHub source per refresh (descriptions from `skill.json` / `SKILL.md`). `0` = skip enrichment (synthetic blurbs only). |
| `githubMetadataEnrichConcurrency` | Parallel raw fetches (default 8). |
| `GITHUB_TOKEN` | Unauthenticated REST can hit **403** on large orgs; a token raises REST rate limits and enables private repos. A **403** triggers a one-time `process.emitWarning` suggesting `GITHUB_TOKEN`. |

Per **GitHub** source (optional):

- `enrich: false` — skip metadata enrichment for that repo only.  
- `enrichMax: 80` — override global `githubMetadataEnrichMax` for that repo.

## Discovery rules

### GitHub tree

One **Contents API** call lists `path` (e.g. `skills`):

| Repo entry | Treated as |
|------------|------------|
| Subdirectory | Skill at `{path}/{dirname}/` |
| `*.md` file (except `README.md`) | Single-file skill |

Skill names in the merged index are **namespaced** as `{catalogId}--{folderOrStem}`.

### npm tree

`- type: npm` with **`package`** (full name, e.g. `@scope/pkg`). The engine resolves the tarball, lists **`path`** inside the package (default `skills`), and emits the same style of entries. **`spec-engine add`** writes `source: npm` with `sourceConfig.package`, `path`, `version`, and optional `registry` so **`NpmSource`** can install a **subfolder** of the package (see `skillSubPath` handling in `npm-source.ts`).

## CLI behavior

With a valid `sources.config.yaml`:

- **`spec-engine search`** — dynamic catalog search **merged** with the small **offline** suggestion list (deduped by name; catalog hits ranked slightly higher).  
- **`getSkillInfo` / `add`** — resolve against the dynamic registry first; if not found, **fall back** to the offline catalog before erroring.

Without config, search/info behave as **offline-only** (unchanged).

## Extending

- **HTTP enterprise catalogs:** `RegistryProvider` + `DefaultRegistry` (see [EXTENSIONS.md](EXTENSIONS.md)).

## Normalization & agents

Discovery produces **registry entries**. Install still uses **`GitHubSource`** / **`NpmSource`** → **normalize** → **adapters**.
