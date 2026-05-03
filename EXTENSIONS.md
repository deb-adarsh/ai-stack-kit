# Extension strategy

Ai Stack Kit is built around **small interfaces** and **explicit registration**. New transports, IDEs, and catalogs are added by **implementing an interface** and **registering** (or **injecting** a factory) at the host boundary — not by editing the pipeline’s control flow.

## Design principles

| Principle | How it shows up in code |
|-----------|-------------------------|
| **Open types** | `SourceType` and `ClientType` include `string` so specs can name sources/clients the core has never heard of (`src/types/skill.ts`, `src/types/spec.ts`). Zod mirrors this (`z.string()` in `src/validation/schema.ts`). |
| **Stable contracts** | Skills flow **resolve → fetch → install** (`SkillSource`). IDE output flows **normalize → generateConfig → apply** (`ClientAdapter`). Discovery is **search / getSkill** (`RegistryProvider`). |
| **Injection over forks** | `apply()` accepts `skillSourceFactory?: SkillSourceFactory` (`src/pipeline/apply-pipeline.ts`). Adapters resolve through `AdapterFactory` (`src/client-adapters/adapter-factory.ts`). |
| **Composed registries** | `DefaultRegistry` merges several `RegistryProvider` backends; enterprise auth is a thin layer on HTTP (`src/registry/discovery/`). |

## Three extension surfaces

### 1. Skill sources (`SkillSource`)

**When:** A skill lives somewhere new (Bitbucket, GCS tarball, internal Artifactory, signed S3 URL, etc.).

**Contract:** `src/sources/base/skill-source.ts` — `type`, `canHandle`, `resolve`, `fetch`, `install`.

**Register:** `SkillSourceFactory.register(source, { priority: 'first' | 'last' })` (`src/sources/skill-source-factory.ts`).

**Wire into the pipeline:** Build a factory, register your source(s), pass it into `apply({ skillSourceFactory })`. The stock CLI uses `SkillSourceFactory.withDefaults()` only; **embedders** (CI image, internal CLI wrapper, VS Code extension host) pass a custom factory without changing `apply()` internals.

### 2. IDE / client adapters (`ClientAdapter`)

**When:** A new editor or agent host needs different paths, merge rules, or file formats.

**Contract:** `src/client-adapters/client-adapter.ts` — `supports`, `generateConfig` (pure), `apply` (disk). Prefer subclassing `BaseClientAdapter` so `apply` reuses `applyAdapterOutput` (`src/client-adapters/base-client-adapter.ts`).

**Register:** `AdapterFactory.register(adapter)` (static helper on the shared default factory).

**Invariant:** Adapters consume **`NormalizedWorkspaceInput` only** (`src/client-adapters/normalized.ts`). They must not parse raw skill tarballs or spec skill entries directly — that stays in the normalizer so new IDEs do not re-couple to sources.

### 3. Enterprise / multi-catalog discovery (`RegistryProvider`)

**When:** You need private search, geo mirrors, SSO-backed APIs, or “public + internal” merged catalogs.

**Contract:** `src/registry/discovery/registry-provider.ts` — `id`, `search`, `getSkill`.

**Compose:** `new DefaultRegistry([local, enterprise, publicRemote])` (`src/registry/discovery/default-registry.ts`).

**Enterprise HTTP:** `EnterpriseRegistry` adds Bearer + optional tenant header on top of `RemoteApiRegistry` (`src/registry/discovery/enterprise-registry.ts`). For mTLS or custom auth, pass a `fetchImpl` into `RemoteApiRegistryOptions` or wrap `RemoteApiRegistry` in your own `RegistryProvider`.

---

## Example: `BitbucketSource` (new skill source)

Bitbucket Server/Cloud can expose **tag tarballs** (similar to GitHub’s `codeload` flow). Below is a **minimal skeleton** showing the extension points; adjust URLs and auth for your edition (Cloud vs Data Center).

Import paths below target the **built** package (`dist/`). In a monorepo you can depend on the workspace package and import the same paths after `npm run build`, or add a `package.json` `"exports"` map for cleaner entrypoints.

```typescript
// packages/company-spec-sources/src/bitbucket-source.ts
import type { SkillMetadata, SkillReference, SkillManifest } from 'ai-stack-kit/dist/types/skill.js';
import type {
  InstallContext,
  SkillFiles,
  SkillInstallResult,
  SkillSource,
} from 'ai-stack-kit/dist/sources/base/skill-source.js';

/** Use source: "bitbucket" in spec.yaml (allowed by SourceType string union). */
export class BitbucketSource implements SkillSource {
  readonly type = 'bitbucket' as const;

  constructor(private readonly options?: { token?: string; fetchImpl?: typeof fetch }) {}

  canHandle(ref: SkillReference): boolean {
    return ref.source === 'bitbucket';
  }

  async resolve(ref: SkillReference): Promise<SkillMetadata> {
    // Parse ref.sourceConfig: workspace, repo, ref — build metadata.id, fetchUrl, checksum, etc.
    throw new Error('BitbucketSource.resolve: implement workspace/repo/ref resolution');
  }

  async fetch(metadata: SkillMetadata): Promise<SkillFiles> {
    // GET tarball (Bitbucket archive URL), extract like GitHubSource / NpmSource (tar + tmpdir)
    throw new Error('BitbucketSource.fetch: implement download + parse manifest');
  }

  async install(
    metadata: SkillMetadata,
    fetched: SkillFiles,
    ctx: InstallContext
  ): Promise<SkillInstallResult> {
    // Mirror layout used by GitHubSource.install — stable path under ctx.installRoot
    throw new Error('BitbucketSource.install: implement disk layout');
  }
}
```

**Bootstrap (host / wrapper, no core edits):**

```typescript
import { apply } from 'ai-stack-kit/dist/pipeline/index.js';
import { SkillSourceFactory } from 'ai-stack-kit/dist/sources/index.js';
import { BitbucketSource } from '@acme/spec-sources';

const skillSourceFactory = SkillSourceFactory.withDefaults();
skillSourceFactory.register(new BitbucketSource({ token: process.env.BITBUCKET_TOKEN }), {
  priority: 'first',
});

await apply({ projectRoot: '/path/to/repo', skillSourceFactory });
```

**Spec snippet:**

```yaml
skills:
  - name: internal-ui-kit
    version: "1.2.0"
    source: bitbucket
    sourceConfig:
      workspace: "my-workspace"
      repo: "skills-ui-kit"
      ref: "v1.2.0"
```

Optional literals (`bitbucket`) in `SourceType` / Zod are **documentation and autocomplete** only; custom strings already validate.

---

## Example: `VSCodeAdapter` (new IDE)

Map the normalized model to files VS Code tooling can consume (e.g. workspace recommendations, MCP config fragments, or a generated doc under `.vscode/`). This example writes a **managed** manifest + a single markdown rollup; tune paths to your org’s conventions.

```typescript
// packages/company-vscode-adapter/src/vscode-adapter.ts
import { BaseClientAdapter } from 'ai-stack-kit/dist/client-adapters/base-client-adapter.js';
import type { NormalizedWorkspaceInput } from 'ai-stack-kit/dist/client-adapters/normalized.js';
import type { AdapterOutput } from 'ai-stack-kit/dist/client-adapters/adapter-output.js';

export class VSCodeClientAdapter extends BaseClientAdapter {
  readonly name = 'vscode';

  supports(clientType: string): boolean {
    return clientType === 'vscode';
  }

  generateConfig(input: NormalizedWorkspaceInput): AdapterOutput {
    const lines: string[] = [
      `# Ai Stack Kit — ${input.metadata.projectName ?? 'project'}`,
      '',
      ...input.skills.map((s) => `- **${s.name}** @ ${s.version}`),
    ];
    return {
      files: [
        {
          path: '.vscode/aistack/generated.md',
          content: lines.join('\n') + '\n',
          mergeStrategy: 'overwrite',
          managed: true,
          provenance: `aistack:${input.metadata.generatedAt}`,
        },
        {
          path: '.vscode/aistack/manifest.json',
          content: JSON.stringify(
            {
              version: 1,
              generatedAt: input.metadata.generatedAt,
              skills: input.skills.map((s) => ({ id: s.id, name: s.name, version: s.version })),
            },
            null,
            2
          ) + '\n',
          mergeStrategy: 'overwrite',
          managed: true,
        },
      ],
    };
  }
}
```

**Register before `apply()`:**

```typescript
import { AdapterFactory } from 'ai-stack-kit/dist/client-adapters/index.js';
import { VSCodeClientAdapter } from '@acme/vscode-adapter';

AdapterFactory.register(new VSCodeClientAdapter());
// then apply({ projectRoot }) — pipeline picks adapter by spec.client.type
```

**Spec:**

```yaml
client:
  type: vscode
```

---

## Enterprise registry checklist

1. **Expose (or proxy) the minimal HTTP contract** documented on `RemoteApiRegistry` (`src/registry/discovery/remote-api-registry.ts`): search + get-by-name.
2. **Auth:** `new EnterpriseRegistry({ baseUrl, bearerToken, tenantId })` or `new RemoteApiRegistry({ baseUrl, fetchImpl: mySignedFetch })`.
3. **Merge catalogs:** `new DefaultRegistry([internal, npmMirror, localJson])` so search dedupes by name and `getSkill` falls through in order.
4. **CLI / search UI:** Today’s CLI may still use a static catalog for demos; wire your `RegistryProvider` in the command layer the same way you would wire a custom `SkillSourceFactory` — **composition at the edge**, not inside `apply()` unless you add an optional `registry?: RegistryProvider` to higher-level commands (future-friendly pattern).

---

## Summary

| Goal | Mechanism |
|------|-----------|
| New skill transport | Implement `SkillSource`, `factory.register`, pass `skillSourceFactory` into `apply`. |
| New IDE | Implement `ClientAdapter` (often `extends BaseClientAdapter`), `AdapterFactory.register`. |
| Enterprise catalogs | Implement or wrap `RegistryProvider`; compose with `DefaultRegistry`; auth via `EnterpriseRegistry` or custom `fetchImpl`. |

**No core changes** means: the pipeline and types already treat unknown `source` / `client` strings as valid; extensions ship in **separate packages** or **thin internal wrappers** that register implementations before calling `apply()`.
