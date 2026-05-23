# Releasing the VS Code / Cursor extension

AI Stack Kit ships the **same VSIX** to two registries so it is installable from every popular IDE:

| Registry | Powers | Publisher / namespace |
|----------|--------|------------------------|
| [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=deb-adarsh.ai-stack-kit) | VS Code | `deb-adarsh` |
| [Open VSX Registry](https://open-vsx.org/extension/deb-adarsh/ai-stack-kit) | Cursor, VSCodium, Gitpod, Theia, Eclipse Che | `deb-adarsh` |

Cursor **does not** query the Visual Studio Marketplace, so any release that skips Open VSX is invisible to Cursor users.

---

## One-time setup

### 1. Claim publisher / namespace on each registry

| Registry | URL | Steps |
|----------|-----|-------|
| Visual Studio Marketplace | <https://marketplace.visualstudio.com/manage/publishers/> | Sign in with the Microsoft account that owns the Azure DevOps org, create the publisher **`deb-adarsh`**. |
| Open VSX Registry | <https://open-vsx.org/user-settings/namespaces> | Sign in with **GitHub**, click **Create namespace**, enter **`deb-adarsh`**. |

The `name` field in `extension/package.json` (`ai-stack-kit`) and the `publisher` field (`deb-adarsh`) must match on both registries. If you ever change the publisher, you must claim a fresh namespace on Open VSX too.

### 2. Generate Personal Access Tokens

| Registry | Token type | Create at |
|----------|------------|-----------|
| Marketplace | Azure DevOps **PAT** with **Marketplace → Manage** scope, **All accessible organizations** | <https://dev.azure.com/> → User settings → Personal access tokens |
| Open VSX | Eclipse **access token** scoped to your account | <https://open-vsx.org/user-settings/tokens> |

### 3. Add them as GitHub repo secrets

In **Settings → Secrets and variables → Actions**:

| Secret name | Value |
|-------------|-------|
| `VSCE_PAT` | Azure DevOps PAT from step 2 |
| `OVSX_PAT` | Open VSX token from step 2 |

If `OVSX_PAT` is missing the workflow logs a warning and skips only the Open VSX step — the Marketplace publish still runs.

---

## Cutting a release

1. **Edit code** as usual on `main`.
2. **Bump versions** as needed:
   - `extension/package.json` → `version`
   - `extension/CHANGELOG.md` → new section at the top
3. **Commit** (e.g. `Extension v1.3.1`).
4. **Tag and push**:

   ```bash
   git tag v1.3.1
   git push origin v1.3.1
   ```

5. The **Publish VS Code Extension** workflow (`.github/workflows/publish-extension.yml`) fires on the tag and runs:
   1. Build + unit tests + integration tests + bundle-size check.
   2. `vsce package` → produces `extension/ai-stack-kit-<version>.vsix`.
   3. Uploads the VSIX as an artifact on the workflow run.
   4. `vsce publish --packagePath …` → Visual Studio Marketplace.
   5. `ovsx publish --packagePath …` → Open VSX Registry (skipped if `OVSX_PAT` is unset).

Once the workflow turns green:

- Marketplace listing: <https://marketplace.visualstudio.com/items?itemName=deb-adarsh.ai-stack-kit>
- Open VSX listing: <https://open-vsx.org/extension/deb-adarsh/ai-stack-kit>
- Cursor users get the update automatically in **Extensions → Updates**.

---

## Publishing manually (local fallback)

If CI is down or you need to ship a hotfix from your laptop:

```bash
cd extension
npm install                                  # ensure vsce + ovsx are present

export VSCE_PAT=...                          # Azure DevOps PAT
export OVSX_PAT=...                          # Open VSX token

npm run build:webview && npm run package     # produce dist/extension.js
npm run vsix                                 # writes ai-stack-kit-<v>.vsix

npm run publish:marketplace                  # vsce publish
npm run publish:openvsx                      # ovsx publish (uses same VSIX in cwd)

# or do both in one shot:
npm run publish:all
```

Sanity checks before publishing:

- `node -e "console.log(require('./package.json').version)"` matches the tag you intend to push.
- `vsce ls --no-dependencies` shows the file set you expect (no `node_modules`, no `out/test`).
- The local VSIX installs cleanly: `cursor --install-extension ai-stack-kit-<v>.vsix`.

---

## Rolling back

- **Marketplace** — open the extension in [Manage publishers](https://marketplace.visualstudio.com/manage/publishers/deb-adarsh) and click **Unpublish** on the bad version, then publish the previous good version with a higher version number (Marketplace never reuses versions).
- **Open VSX** — `ovsx delete deb-adarsh.ai-stack-kit <version>` (requires `OVSX_PAT`). Then republish the previous good build with a higher version.

The two registries cannot be "rolled back to the same version" — always ship a new patch.

---

## FAQ

**Why doesn't Cursor see my Marketplace publish?**
Cursor uses Open VSX, not the Visual Studio Marketplace. Publish to both (this workflow does that automatically).

**Why does the Open VSX upload say "namespace not found"?**
You skipped step 1 — claim the `deb-adarsh` namespace at <https://open-vsx.org/user-settings/namespaces>. The first publish into a brand-new namespace can take a few minutes to propagate.

**Can I keep using `npm run publish:patch` locally?**
Yes — that still publishes to the Marketplace only. Follow it with `npm run publish:openvsx` (or just use `npm run publish:all`) to keep Cursor in sync.
