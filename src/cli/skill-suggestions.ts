/**
 * Curated suggestible skills + scoring from {@link ProjectSignals}.
 *
 * Relationship to the weekly catalog job (`npm run build:catalog`, `web/public/catalog.json`, Skill browser):
 * that pipeline **re-indexes everything** from `templates/sources.config.yaml`. This file does **not**
 * participate in that sync — it is a **small, hand-maintained** set used for:
 * - `aistack init` defaults (works **offline** for ranking; GitHub paths below must stay valid)
 * - Opinionated lanes (`ui` / `backend` / `shared`) and tags driving scores from repo signals
 *
 * When upstream catalogs gain skills you want highlighted here, **extend `CATALOG` manually** (and keep
 * `github` paths accurate). The full set remains discoverable via `aistack search` / browser once sources load.
 *
 * Rules:
 * - **React** (incl. Next) → prioritize **UI lane** agents.
 * - **Node** with backend hints or non-UI-only → prioritize **backend lane**.
 * - **.NET / Java / Go / Python / Rust** (no `package.json` required) → boost **backend** and generic shared skills; de-emphasize TypeScript-first picks without TS.
 * - Both → UI first when React; polyglot backends use backend/shared lanes.
 */

import type { ProjectSignals } from './project-detection.js';

export type SuggestionLane = 'ui' | 'backend' | 'shared';

export interface SuggestibleSkill {
  id: string;
  name: string;
  description: string;
  lane: SuggestionLane;
  tags: string[];
  /** Default registry/source label for spec templates */
  source: string;
  /** 0–1 relevance after scoring */
  score: number;
  /** Pre-check for multi-select */
  recommended: boolean;
}

/** Public repo + path inside tarball root used when scaffolding spec.yaml from init picks. */
export interface SuggestionGithubSource {
  owner: string;
  repo: string;
  /** Directory path inside the repo (e.g. `skills/canvas-design`). */
  path: string;
  branch?: string;
}

interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  lane: SuggestionLane;
  tags: string[];
  source: string;
  /** Base score before project signals */
  baseWeight: number;
  /** Resolved GitHub location for `aistack init` → spec.yaml rows */
  github: SuggestionGithubSource;
}

const CATALOG: CatalogEntry[] = [
  // UI lane (React → suggest these)
  {
    id: 'react-ui-expert',
    name: 'react-ui-expert',
    description: 'Component patterns, layout, and accessible UI for React apps',
    lane: 'ui',
    tags: ['react', 'ui', 'frontend', 'a11y'],
    source: 'github',
    baseWeight: 0.35,
    github: { owner: 'anthropics', repo: 'skills', path: 'skills/frontend-design' },
  },
  {
    id: 'figma-agent',
    name: 'figma-agent',
    description: 'Design-to-code and design-system alignment',
    lane: 'ui',
    tags: ['figma', 'design', 'ui'],
    source: 'github',
    baseWeight: 0.3,
    github: { owner: 'anthropics', repo: 'skills', path: 'skills/brand-guidelines' },
  },
  {
    id: 'canvas',
    name: 'canvas',
    description: 'Interactive canvases and visual explanations beside your work',
    lane: 'ui',
    tags: ['visualization', 'ui', 'canvas'],
    source: 'github',
    baseWeight: 0.45,
    github: { owner: 'anthropics', repo: 'skills', path: 'skills/canvas-design' },
  },
  // Backend lane (Node → suggest these)
  {
    id: 'node-api-agent',
    name: 'node-api-agent',
    description: 'REST/GraphQL handlers, validation, and error contracts',
    lane: 'backend',
    tags: ['node', 'api', 'backend'],
    source: 'github',
    baseWeight: 0.4,
    github: { owner: 'github', repo: 'awesome-copilot', path: 'skills/openapi-to-application-code' },
  },
  {
    id: 'prisma-data-layer',
    name: 'prisma-data-layer',
    description: 'Schema design, migrations, and safe data access',
    lane: 'backend',
    tags: ['prisma', 'sql', 'backend'],
    source: 'github',
    baseWeight: 0.32,
    github: { owner: 'github', repo: 'awesome-copilot', path: 'skills/postgresql-code-review' },
  },
  {
    id: 'security-headers',
    name: 'security-headers',
    description: 'AuthN/Z, cookies, CORS, and OWASP-oriented API hardening',
    lane: 'backend',
    tags: ['security', 'api', 'backend'],
    source: 'github',
    baseWeight: 0.28,
    github: { owner: 'github', repo: 'awesome-copilot', path: 'skills/security-review' },
  },
  // Shared
  {
    id: 'typescript-helper',
    name: 'typescript-helper',
    description: 'Types, narrowing, and TS-first refactors',
    lane: 'shared',
    tags: ['typescript', 'types'],
    source: 'github',
    baseWeight: 0.38,
    github: { owner: 'github', repo: 'awesome-copilot', path: 'skills/javascript-typescript-jest' },
  },
  {
    id: 'test-generator',
    name: 'test-generator',
    description: 'Unit and integration test scaffolding',
    lane: 'shared',
    tags: ['testing', 'jest', 'vitest'],
    source: 'github',
    baseWeight: 0.25,
    github: { owner: 'anthropics', repo: 'skills', path: 'skills/webapp-testing' },
  },
  {
    id: 'code-review',
    name: 'code-review',
    description: 'Structured AI code review checklists',
    lane: 'shared',
    tags: ['review', 'quality'],
    source: 'registry',
    baseWeight: 0.22,
    github: { owner: 'github', repo: 'awesome-copilot', path: 'skills/review-and-refactor' },
  },
];

/** GitHub coordinates for an init-time suggestion id (`spec.skills[].name`). */
export function resolveSuggestionGithubSource(skillName: string): SuggestionGithubSource | null {
  const c = CATALOG.find((x) => x.name === skillName);
  return c?.github ?? null;
}

function backendProfile(s: ProjectSignals): boolean {
  return (
    s.isNodeProject ||
    s.usesDotnet ||
    s.usesJava ||
    s.usesGo ||
    s.hasPython ||
    s.hasRust
  );
}

function laneBoost(s: ProjectSignals, lane: SuggestionLane): number {
  const reactUi = s.usesReact || s.usesNext || s.usesReactNative;
  const anyBackend = backendProfile(s);

  if (lane === 'ui') {
    if (reactUi) return 0.45;
    return 0.05;
  }
  if (lane === 'backend') {
    if (!anyBackend) return 0.05;
    if (s.isNodeProject) {
      if (s.backendHints.length) return 0.42;
      if (!reactUi) return 0.38;
      return 0.2;
    }
    // .NET, JVM, Go, Python-only, Rust: generic backend/API agents
    return 0.38;
  }
  // shared
  let b = 0.15;
  if (s.usesTypeScript) b += 0.12;
  else if (s.isNodeProject) b += 0.04;
  if (s.hasJestOrVitest) b += 0.08;
  if (!s.usesTypeScript && anyBackend) b += 0.06;
  return Math.min(0.35, b);
}

/**
 * Build ordered suggestions from local project signals (offline).
 */
export function buildSkillSuggestions(signals: ProjectSignals): SuggestibleSkill[] {
  const scored = CATALOG.map((c) => {
    const score = Math.min(1, c.baseWeight + laneBoost(signals, c.lane));
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      lane: c.lane,
      tags: c.tags,
      source: c.source,
      score,
      recommended: false,
    };
  });

  // Recommended: top of each lane when signals match
  const reactUi = signals.usesReact || signals.usesNext || signals.usesReactNative;
  const backendish = backendProfile(signals);
  for (const s of scored) {
    if (s.lane === 'ui' && reactUi && s.score >= 0.55) s.recommended = true;
    if (s.lane === 'backend' && backendish && s.score >= 0.55) s.recommended = true;
    if (s.lane === 'shared' && signals.usesTypeScript && s.name === 'typescript-helper') s.recommended = true;
    if (s.lane === 'shared' && signals.hasJestOrVitest && s.name === 'test-generator') s.recommended = true;
  }

  // Always nudge canvas for rich UI work when React
  if (reactUi) {
    const canvas = scored.find((x) => x.name === 'canvas');
    if (canvas) canvas.recommended = true;
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/** Filter catalog by simple substring / tag match (local “search”). */
export function filterSuggestible(query: string, items: SuggestibleSkill[]): SuggestibleSkill[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some((t) => t.includes(q)) ||
      s.lane.includes(q)
  );
}
