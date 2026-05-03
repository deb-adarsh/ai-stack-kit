/**
 * Curated suggestible skills + scoring from {@link ProjectSignals}.
 *
 * Rules:
 * - **React** (incl. Next) → prioritize **UI lane** agents.
 * - **Node** (package.json) with backend hints or non-UI-only → prioritize **backend lane**.
 * - Both → UI first, backend second; shared skills always available.
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

interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  lane: SuggestionLane;
  tags: string[];
  source: string;
  /** Base score before project signals */
  baseWeight: number;
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
  },
  {
    id: 'figma-agent',
    name: 'figma-agent',
    description: 'Design-to-code and design-system alignment',
    lane: 'ui',
    tags: ['figma', 'design', 'ui'],
    source: 'github',
    baseWeight: 0.3,
  },
  {
    id: 'canvas',
    name: 'canvas',
    description: 'Interactive canvases and visual explanations beside your work',
    lane: 'ui',
    tags: ['visualization', 'ui', 'canvas'],
    source: 'github',
    baseWeight: 0.45,
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
  },
  {
    id: 'prisma-data-layer',
    name: 'prisma-data-layer',
    description: 'Schema design, migrations, and safe data access',
    lane: 'backend',
    tags: ['prisma', 'sql', 'backend'],
    source: 'github',
    baseWeight: 0.32,
  },
  {
    id: 'security-headers',
    name: 'security-headers',
    description: 'AuthN/Z, cookies, CORS, and OWASP-oriented API hardening',
    lane: 'backend',
    tags: ['security', 'api', 'backend'],
    source: 'github',
    baseWeight: 0.28,
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
  },
  {
    id: 'test-generator',
    name: 'test-generator',
    description: 'Unit and integration test scaffolding',
    lane: 'shared',
    tags: ['testing', 'jest', 'vitest'],
    source: 'github',
    baseWeight: 0.25,
  },
  {
    id: 'code-review',
    name: 'code-review',
    description: 'Structured AI code review checklists',
    lane: 'shared',
    tags: ['review', 'quality'],
    source: 'registry',
    baseWeight: 0.22,
  },
];

function laneBoost(s: ProjectSignals, lane: SuggestionLane): number {
  const reactUi = s.usesReact || s.usesNext || s.usesReactNative;

  if (lane === 'ui') {
    if (reactUi) return 0.45;
    return 0.05;
  }
  if (lane === 'backend') {
    if (!s.isNodeProject) return 0.05;
    // Node → backend agents
    if (s.backendHints.length) return 0.42;
    if (!reactUi) return 0.38;
    return 0.2;
  }
  // shared
  let b = 0.15;
  if (s.usesTypeScript) b += 0.12;
  if (s.hasJestOrVitest) b += 0.08;
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
  for (const s of scored) {
    if (s.lane === 'ui' && reactUi && s.score >= 0.55) s.recommended = true;
    if (s.lane === 'backend' && signals.isNodeProject && s.score >= 0.55) s.recommended = true;
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
