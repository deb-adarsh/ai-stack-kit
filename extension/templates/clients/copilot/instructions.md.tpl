# GitHub Copilot + AI Stack Kit

This workspace syncs **{{skillCount}}** skills and **{{agentCount}}** Copilot agents.

- **Skills**: folders under **`{{skillsDir}}/`** (each folder keeps `SKILL.md` and bundled files — no special rename beyond that).
- **Agents**: **`{{agentsDir}}/*.agent.md`** only — GitHub Copilot requires this `*.agent.md` naming; Cursor and Claude adapters use plain `*.md` instead.
- **Hooks**: lifecycle hook packs (for example `hook.json` + scripts) under **`{{hooksDir}}/{hook-name}/`** when your spec lists `moduleType: hook` modules.
- **Snippets**: mirrored at `aistack.copilot.promptSnippets` in `.vscode/settings.json` for quick chat use.
- Re-run AI Stack Kit to refresh; settings merge deep under the `aistack` root without clobbering unrelated VS Code keys.
