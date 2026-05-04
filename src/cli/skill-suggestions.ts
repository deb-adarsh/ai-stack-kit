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
 * - **.NET** → promote **`awesome-copilot`** / **`openai/skills`** `.NET` rows; demote Node-only rows when there is no `package.json`.
 * - **Python** → **`awesome-copilot`** Python/pytest + **`openai/skills`** Jupyter curated row.
 * - **Java / Kotlin** → **`awesome-copilot`** Spring Boot + JUnit rows (`usesJava` includes `.kt` / Gradle / Maven).
 * - Other non-Node backends (**Go**, **Rust**) → demote Prisma / Node API via shared rule below.
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
  // .NET — github/awesome-copilot + openai/skills curated (paths verified on main)
  {
    id: 'aspnet-core',
    name: 'aspnet-core',
    description: 'ASP.NET Core structure, middleware, APIs, and idiomatic patterns',
    lane: 'backend',
    tags: ['dotnet', 'csharp', 'aspnet', 'api'],
    source: 'github',
    baseWeight: 0.42,
    github: { owner: 'openai', repo: 'skills', path: 'skills/.curated/aspnet-core', branch: 'main' },
  },
  {
    id: 'aspnet-minimal-api-openapi',
    name: 'aspnet-minimal-api-openapi',
    description: 'Minimal APIs, OpenAPI, and HTTP contracts in .NET',
    lane: 'backend',
    tags: ['dotnet', 'csharp', 'aspnet', 'openapi'],
    source: 'github',
    baseWeight: 0.41,
    github: { owner: 'github', repo: 'awesome-copilot', path: 'skills/aspnet-minimal-api-openapi' },
  },
  {
    id: 'dotnet-best-practices',
    name: 'dotnet-best-practices',
    description: 'C# style, .NET conventions, and design-oriented reviews',
    lane: 'backend',
    tags: ['dotnet', 'csharp', 'backend'],
    source: 'github',
    baseWeight: 0.4,
    github: { owner: 'github', repo: 'awesome-copilot', path: 'skills/dotnet-best-practices' },
  },
  {
    id: 'csharp-xunit',
    name: 'csharp-xunit',
    description: 'xUnit patterns, fixtures, and test layout for .NET',
    lane: 'shared',
    tags: ['csharp', 'dotnet', 'testing', 'xunit'],
    source: 'github',
    baseWeight: 0.3,
    github: { owner: 'github', repo: 'awesome-copilot', path: 'skills/csharp-xunit' },
  },
  // Python — github/awesome-copilot + openai/skills curated
  {
    id: 'python-pypi-package-builder',
    name: 'python-pypi-package-builder',
    description: 'Packaging, pyproject/setup, and publishable Python layouts',
    lane: 'backend',
    tags: ['python', 'packaging', 'pypi'],
    source: 'github',
    baseWeight: 0.39,
    github: { owner: 'github', repo: 'awesome-copilot', path: 'skills/python-pypi-package-builder' },
  },
  {
    id: 'pytest-coverage',
    name: 'pytest-coverage',
    description: 'pytest layout, coverage habits, and test ergonomics',
    lane: 'shared',
    tags: ['python', 'pytest', 'testing'],
    source: 'github',
    baseWeight: 0.31,
    github: { owner: 'github', repo: 'awesome-copilot', path: 'skills/pytest-coverage' },
  },
  {
    id: 'jupyter-notebook',
    name: 'jupyter-notebook',
    description: 'Notebook workflows, reproducibility, and literate Python',
    lane: 'shared',
    tags: ['python', 'jupyter', 'notebook'],
    source: 'github',
    baseWeight: 0.33,
    github: { owner: 'openai', repo: 'skills', path: 'skills/.curated/jupyter-notebook', branch: 'main' },
  },
  // Java / Kotlin (JVM) — github/awesome-copilot
  {
    id: 'java-springboot',
    name: 'java-springboot',
    description: 'Spring Boot structure, beans, APIs, and idiomatic Java services',
    lane: 'backend',
    tags: ['java', 'spring', 'jvm', 'backend'],
    source: 'github',
    baseWeight: 0.41,
    github: { owner: 'github', repo: 'awesome-copilot', path: 'skills/java-springboot' },
  },
  {
    id: 'kotlin-springboot',
    name: 'kotlin-springboot',
    description: 'Spring Boot with Kotlin: DSLs, coroutines-friendly patterns, service layout',
    lane: 'backend',
    tags: ['kotlin', 'spring', 'jvm', 'backend'],
    source: 'github',
    baseWeight: 0.41,
    github: { owner: 'github', repo: 'awesome-copilot', path: 'skills/kotlin-springboot' },
  },
  {
    id: 'java-junit',
    name: 'java-junit',
    description: 'JUnit tests, fixtures, and JVM test organization',
    lane: 'shared',
    tags: ['java', 'kotlin', 'junit', 'testing'],
    source: 'github',
    baseWeight: 0.3,
    github: { owner: 'github', repo: 'awesome-copilot', path: 'skills/java-junit' },
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

const DOTNET_BOOST = new Set([
  'aspnet-core',
  'aspnet-minimal-api-openapi',
  'dotnet-best-practices',
  'csharp-xunit',
]);
const PYTHON_BOOST = new Set(['python-pypi-package-builder', 'pytest-coverage', 'jupyter-notebook']);
const JVM_BOOST = new Set(['java-springboot', 'kotlin-springboot', 'java-junit']);

/** Nudge polyglot repos away from unrelated Node-only picks (offline heuristics). */
function stackScoreAdjustment(c: CatalogEntry, s: ProjectSignals): number {
  let adj = 0;
  const nonNode = !s.isNodeProject;

  if (nonNode && (s.usesDotnet || s.hasPython || s.usesJava || s.usesGo || s.hasRust)) {
    if (c.name === 'node-api-agent' || c.name === 'prisma-data-layer') adj -= 0.26;
  }

  if (nonNode && s.usesDotnet && DOTNET_BOOST.has(c.name)) adj += 0.07;
  if (nonNode && s.hasPython && PYTHON_BOOST.has(c.name)) adj += 0.07;
  if (nonNode && s.usesJava && JVM_BOOST.has(c.name)) adj += 0.07;

  return adj;
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
    const score = Math.min(
      1,
      c.baseWeight + laneBoost(signals, c.lane) + stackScoreAdjustment(c, signals)
    );
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
  const nonNode = !signals.isNodeProject;
  const dotnetLike = nonNode && signals.usesDotnet;
  const pythonLike = nonNode && signals.hasPython;
  const jvmLike = nonNode && signals.usesJava;
  const reactUi = signals.usesReact || signals.usesNext || signals.usesReactNative;
  const backendish = backendProfile(signals);
  for (const s of scored) {
    if (s.lane === 'ui' && reactUi && s.score >= 0.55) s.recommended = true;
    if (s.lane === 'backend' && backendish && s.score >= 0.55) s.recommended = true;
    if (s.lane === 'shared' && signals.usesTypeScript && s.name === 'typescript-helper') s.recommended = true;
    if (s.lane === 'shared' && signals.hasJestOrVitest && s.name === 'test-generator') s.recommended = true;
    if (dotnetLike && s.name === 'csharp-xunit' && s.score >= 0.52) s.recommended = true;
    if (pythonLike && (s.name === 'pytest-coverage' || s.name === 'python-pypi-package-builder') && s.score >= 0.52) {
      s.recommended = true;
    }
    if (jvmLike && s.name === 'java-junit' && s.score >= 0.52) s.recommended = true;
  }

  if (dotnetLike) {
    for (const pick of ['aspnet-core', 'aspnet-minimal-api-openapi', 'dotnet-best-practices'] as const) {
      const row = scored.find((x) => x.name === pick);
      if (row && row.score >= 0.52) row.recommended = true;
    }
  }

  if (pythonLike) {
    const row = scored.find((x) => x.name === 'jupyter-notebook');
    if (row && row.score >= 0.52) row.recommended = true;
  }

  if (jvmLike) {
    for (const pick of ['java-springboot', 'kotlin-springboot'] as const) {
      const row = scored.find((x) => x.name === pick);
      if (row && row.score >= 0.52) row.recommended = true;
    }
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
