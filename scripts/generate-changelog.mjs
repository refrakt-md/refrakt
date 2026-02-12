#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'site', 'content', 'releases.md');

// Collect CHANGELOG.md files from all workspace packages
const dirs = [
  ...glob('packages'),
  ...glob('themes'),
];

const versions = new Map(); // version → Set<change>

for (const dir of dirs) {
  const file = join(root, dir, 'CHANGELOG.md');
  if (!existsSync(file)) continue;
  parseChangelog(readFileSync(file, 'utf8'), versions);
}

// Sort versions by semver descending
const sorted = [...versions.keys()].sort((a, b) => compareSemver(b, a));

// Build output
let body = '';
for (const version of sorted) {
  const date = getTagDate(version);
  const heading = date ? `## v${version} - ${date}` : `## v${version}`;
  const changes = [...versions.get(version)].join('\n');
  body += `${heading}\n\n${changes}\n\n`;
}

const output = `---
title: Changelog
description: Release history for refrakt.md
---

# Changelog

{% changelog %}
${body.trim() || '_No releases yet._'}
{% /changelog %}
`;

writeFileSync(outPath, output);
console.log(`Wrote ${outPath}`);

// --- helpers ---

function glob(subdir) {
  const base = join(root, subdir);
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => join(subdir, d.name));
}

function parseChangelog(text, versions) {
  let currentVersion = null;

  for (const line of text.split('\n')) {
    // Version heading: ## 0.2.0
    const versionMatch = line.match(/^## (\d+\.\d+\.\d+(?:-[\w.]+)?)/);
    if (versionMatch) {
      currentVersion = versionMatch[1];
      if (!versions.has(currentVersion)) versions.set(currentVersion, new Set());
      continue;
    }

    // Skip category headings (### Patch Changes, ### Minor Changes, etc.)
    if (line.match(/^###\s/)) continue;

    // Change entry
    if (currentVersion && line.match(/^- /)) {
      const cleaned = cleanEntry(line);
      if (cleaned) versions.get(currentVersion).add(cleaned);
    }
  }
}

function cleanEntry(line) {
  let text = line;

  // Skip dependency-only entries: "- @refrakt-md/types@0.2.0"
  if (text.match(/^- @[\w-]+\/[\w-]+@\d/)) return null;

  // Skip "Updated dependencies [hash]" entries
  if (text.match(/^- Updated dependencies/)) return null;

  // Remove leading PR/commit link patterns
  text = text.replace(/^- (?:\[.*?\]\(.*?\)\s*)*/, '- ');

  // Remove "Thanks @user! - " prefix
  text = text.replace(/^(- )Thanks @[\w-]+!\s*[-–—]\s*/, '$1');

  // Remove "hash: " prefix (changesets format): "- abc1234: text" → "- text"
  text = text.replace(/^(- )[a-f0-9]{7,}:\s*/, '$1');

  // Remove "hash - " prefix: "- abc1234 - text" → "- text"
  text = text.replace(/^(- )[a-f0-9]{7,}\s*[-–—]\s*/, '$1');

  return text.trim() || null;
}

function getTagDate(version) {
  // Changesets creates tags like "@refrakt-md/types@0.2.0" and "create-refrakt@0.2.0"
  // Try package-scoped tags first, then plain version tags
  const candidates = [
    `@refrakt-md/types@${version}`,
    `v${version}`,
    version,
  ];
  for (const tag of candidates) {
    try {
      const iso = execSync(`git log -1 --format=%aI "${tag}"`, {
        cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      if (iso) {
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    } catch { /* tag doesn't exist */ }
  }
  return '';
}

function compareSemver(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}
