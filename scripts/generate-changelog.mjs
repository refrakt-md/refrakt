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
  ...glob('runes'),
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
  const lines = text.split('\n');
  let currentVersion = null;
  let bulletLines = null;

  function flushBullet() {
    if (bulletLines && currentVersion) {
      // Strip trailing blank lines
      while (bulletLines.length && bulletLines[bulletLines.length - 1].trim() === '') {
        bulletLines.pop();
      }
      processBulletBlock(bulletLines, versions.get(currentVersion));
    }
    bulletLines = null;
  }

  for (const line of lines) {
    // Version heading: ## 0.2.0
    const versionMatch = line.match(/^## (\d+\.\d+\.\d+(?:-[\w.]+)?)/);
    if (versionMatch) {
      flushBullet();
      currentVersion = versionMatch[1];
      if (!versions.has(currentVersion)) versions.set(currentVersion, new Set());
      continue;
    }

    // Category heading at column 0: ### Patch Changes, ### Minor Changes
    if (/^###\s/.test(line)) {
      flushBullet();
      continue;
    }

    if (!currentVersion) continue;

    // Top-level bullet start: "- something"
    if (/^- .+/.test(line)) {
      flushBullet();
      bulletLines = [line];
      continue;
    }

    // Inside a bullet: accumulate blank or indented continuation lines
    if (bulletLines !== null) {
      if (line.trim() === '' || /^\s/.test(line)) {
        bulletLines.push(line);
      } else {
        flushBullet();
      }
      continue;
    }
  }

  flushBullet();
}

function processBulletBlock(lines, versionSet) {
  if (!lines.length || !versionSet) return;

  const firstContent = lines[0].replace(/^- /, '');

  // Heading-label bullets (- ### Editor): extract sub-bullets only
  if (/^#{1,6}\s/.test(firstContent)) {
    for (const line of lines) {
      const subMatch = line.match(/^\s+- (.+)/);
      if (!subMatch) continue;
      if (/^#{1,6}\s/.test(subMatch[1])) continue;
      const cleaned = cleanEntry(`- ${subMatch[1]}`);
      if (cleaned) versionSet.add(cleaned);
    }
    return;
  }

  // Split into paragraphs (separated by blank lines)
  const paragraphs = [];
  let current = [];
  for (const line of lines) {
    if (line.trim() === '') {
      if (current.length) { paragraphs.push(current); current = []; }
    } else {
      current.push(line);
    }
  }
  if (current.length) paragraphs.push(current);

  for (const para of paragraphs) {
    // Separate sub-bullets from prose lines
    const subBullets = [];
    const proseLines = [];
    for (const l of para) {
      if (/^\s+- .+/.test(l)) subBullets.push(l);
      else proseLines.push(l);
    }

    // Process sub-bullets individually
    for (const sb of subBullets) {
      const content = sb.replace(/^\s+- /, '');
      if (/^#{1,6}\s/.test(content)) continue;
      if (/^@[\w-]+\/[\w-]+@\d/.test(content)) continue;
      const cleaned = cleanEntry(`- ${content}`);
      if (cleaned) versionSet.add(cleaned);
    }

    if (!proseLines.length) continue;

    // Skip inline heading labels (  ### Section Name)
    if (proseLines.length === 1 && /^\s+#{1,6}\s/.test(proseLines[0])) continue;

    // Skip category labels (single short line ending with ":")
    if (proseLines.length === 1 && /^\s+\S.*:\s*$/.test(proseLines[0]) && proseLines[0].trim().length < 80) continue;

    // Prose paragraph: unwrap into a single line
    const unwrapped = proseLines
      .map(l => l.replace(/^- /, '').replace(/^\s+/, ''))
      .join(' ')
      .trim();

    if (!unwrapped) continue;
    const cleaned = cleanEntry(`- ${unwrapped}`);
    if (cleaned) versionSet.add(cleaned);
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
  // Try well-known tags first, then fall back to any tag matching this version
  const candidates = [
    `@refrakt-md/types@${version}`,
    `v${version}`,
    version,
  ];

  // Find any tag ending with @{version} as fallback
  try {
    const tags = execSync(`git tag -l "*@${version}"`, {
      cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    if (tags) candidates.push(...tags.split('\n'));
  } catch {}

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
