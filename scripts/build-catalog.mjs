#!/usr/bin/env node
/**
 * Hydrates default GitHub catalogs (templates/sources.config.yaml) and writes web/public/catalog.json
 * for the skill browser. Requires: npm run build, network on first run (GitHub API).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

process.chdir(root);
process.env.AISTACK_SOURCES_CONFIG = path.join(root, 'templates/sources.config.yaml');

const modUrl = pathToFileURL(path.join(root, 'dist/registry/sources/create-dynamic-skill-registry.js')).href;
const { createDynamicSkillRegistry } = await import(modUrl);

const reg = await createDynamicSkillRegistry(root);
if (!reg) {
  console.error('No registry: check templates/sources.config.yaml and AISTACK_SOURCES_CONFIG');
  process.exit(1);
}

const hits = await reg.search('', { limit: 100_000, sortBy: 'name' });
console.log(`Listing ${hits.length} catalog rows (enriching metadata via getSkill)...`);

function publisherLabel(owner) {
  if (!owner) return 'Unknown';
  const map = {
    microsoft: 'Microsoft',
    anthropics: 'Anthropic',
    github: 'GitHub',
    composiohq: 'Composio',
    openai: 'OpenAI',
    google: 'Google',
    googleworkspace: 'Google Workspace',
    sickn33: 'Antigravity',
    getsentry: 'Sentry',
    figma: 'Figma',
    firebase: 'Firebase',
    cloudflare: 'Cloudflare',
    vercel: 'Vercel',
    stripe: 'Stripe',
    coinbase: 'Coinbase',
    binance: 'Binance',
    huggingface: 'Hugging Face',
    apollographql: 'Apollo GraphQL',
    auth0: 'Auth0',
    flutter: 'Flutter',
    expo: 'Expo',
    wordpress: 'WordPress',
    netlify: 'Netlify',
    mongodb: 'MongoDB',
    supabase: 'Supabase',
    neon: 'Neon',
    notion: 'Notion',
    sanity: 'Sanity',
    replicate: 'Replicate',
    browserbase: 'Browserbase',
    trailofbits: 'Trail of Bits',
    duckdb: 'DuckDB',
    hashicorp: 'HashiCorp',
    voltagent: 'VoltAgent',
    garrytan: 'Garry Tan',
    addyosmani: 'Addy Osmani',
    brave: 'Brave',
    datadog: 'Datadog Labs',
    coderabbitai: 'CodeRabbit',
    firecrawl: 'Firecrawl',
    minimax: 'MiniMax',
    callstack: 'Callstack',
    remotion: 'Remotion',
    betterauth: 'Better Auth',
    typefully: 'Typefully',
    clickhouse: 'ClickHouse',
    tinybird: 'Tinybird',
    wpengine: 'WP Engine',
  };
  const k = owner.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (map[k]) return map[k];
  return owner
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Umbrella for filters: Microsoft ↔ GitHub + microsoft org; Google ↔ google org + Antigravity (+ Workspace/Firebase). */
function publisherFamily(owner, catalogId) {
  const o = (owner || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (['microsoft', 'github'].includes(o)) return 'Microsoft';
  if (['google', 'googleworkspace', 'firebase', 'sickn33'].includes(o)) return 'Google';
  return publisherLabel(owner || catalogId);
}

function publisherChannel(catalogId, ownerKey, skillPath) {
  const id = (catalogId || '').toLowerCase();
  const pathNorm = (skillPath || '').replace(/\\/g, '/').toLowerCase();
  if (id === 'awesome-copilot') return 'Copilot community';
  if (id === 'microsoft-azure-skills') return 'Azure';
  if (id === 'google-skills-cloud' || (pathNorm.includes('skills/cloud') && ownerKey === 'google'))
    return 'Google Cloud';
  if (id === 'antigravity-awesome-skills') return 'Antigravity';
  if (id === 'anthropic-skills') return 'Anthropic reference';
  if (id === 'composio-awesome-claude-skills') return 'Composio curated';
  if (ownerKey === 'github') return 'GitHub';
  return null;
}

function sortFamilies(list) {
  const priority = ['Microsoft', 'Google'];
  return [...list].sort((a, b) => {
    const ia = priority.indexOf(a);
    const ib = priority.indexOf(b);
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    return a.localeCompare(b);
  });
}

function toSkillRecord(hit, entry) {
  const cfg = entry.source?.config ?? {};
  const owner = typeof cfg.owner === 'string' ? cfg.owner : '';
  const repo = typeof cfg.repo === 'string' ? cfg.repo : '';
  const branch = typeof cfg.branch === 'string' ? cfg.branch : 'main';
  const skillPath = typeof cfg.path === 'string' ? cfg.path : '';
  const skillFolder = typeof cfg.skillFolder === 'string' ? cfg.skillFolder : hit.name.split('--').pop() ?? hit.name;
  const catalogId = typeof cfg.catalogId === 'string' ? cfg.catalogId : '';
  const ownerKey = (owner || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const pubFam = publisherFamily(owner, catalogId);
  const pubChannel = publisherChannel(catalogId, ownerKey, skillPath);

  let githubBrowse = entry.repository ?? null;
  if (owner && repo) {
    const base = `https://github.com/${owner}/${repo}/tree/${encodeURIComponent(branch)}`;
    githubBrowse = skillPath ? `${base}/${skillPath.replace(/^\//, '')}` : base;
  }

  return {
    id: hit.name,
    skillFolder,
    description: hit.description,
    catalogId,
    publisherId: owner || catalogId || 'unknown',
    publisherLabel: publisherLabel(owner || catalogId),
    publisherFamily: pubFam,
    publisherChannel: pubChannel,
    repo: owner && repo ? `${owner}/${repo}` : '',
    supportedClients: hit.supportedClients ?? [],
    moduleType: hit.moduleType ?? 'skill',
    githubBrowse,
  };
}

const BATCH = 32;
const skills = [];
for (let i = 0; i < hits.length; i += BATCH) {
  const slice = hits.slice(i, i + BATCH);
  const rows = await Promise.all(
    slice.map(async (h) => {
      try {
        const entry = await reg.getSkill(h.name);
        return entry ? toSkillRecord(h, entry) : null;
      } catch {
        return null;
      }
    })
  );
  for (const r of rows) {
    if (r) skills.push(r);
  }
  if (i % (BATCH * 10) === 0 && i > 0) {
    process.stdout.write(`  … ${Math.min(i + BATCH, hits.length)} / ${hits.length}\n`);
  }
}

const publishers = [...new Set(skills.map((s) => s.publisherLabel))].sort((a, b) => a.localeCompare(b));
const publisherFamilies = sortFamilies([...new Set(skills.map((s) => s.publisherFamily))]);

const payload = {
  generatedAt: new Date().toISOString(),
  count: skills.length,
  publisherFamilies,
  publishers,
  skills,
};

const outDir = path.join(root, 'web/public');
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'catalog.json');
writeFileSync(outFile, JSON.stringify(payload), 'utf-8');
console.log(`Wrote ${skills.length} skills → ${path.relative(root, outFile)}`);
