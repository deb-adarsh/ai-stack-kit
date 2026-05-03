# Orchestration (Claude)

Project: **{{project}}**

- Agents: **{{agentCount}}**
- Prompts: **{{promptCount}}**

## Session flow

1. Read `.claude/system-bundle.aistack.md` once (aggregated system context).
2. Use individual agents under `.claude/agents/` and prompts under `.claude/prompts/` as needed.
3. Skills ship as folders under `.claude/skills/` (each with `SKILL.md` plus assets).
4. Prefer changing `spec.yaml` / skills and re-running AI Stack Kit rather than hand-editing generated files.
