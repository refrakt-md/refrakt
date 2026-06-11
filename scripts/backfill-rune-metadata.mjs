#!/usr/bin/env node
/**
 * Backfill `category` / `plugin` / `status` frontmatter onto every rune
 * reference page (WORK-385, SPEC-092).
 *
 * The generated rune catalogue (WORK-386) queries the `rune` entity type by
 * these fields. Hand-editing ~100 pages drifts, so derive them:
 *
 *   - `type`     — `rune`, which registers the page as a first-class `rune`
 *                  registry entity (SPEC-092 Layer 2) in addition to `page`.
 *                  Written per-page rather than via an `entityRules` glob so
 *                  that concept / overview / guide pages under runes/ (which a
 *                  `runes/**` rule would wrongly capture) stay `page`-only — the
 *                  script already identifies exactly the real runes.
 *   - `plugin`   — `core` for a top-level page, else the owning plugin
 *                  (the page's subdirectory under site/content/runes).
 *   - `category` — the page's nav group in `runes/_layout.md`.
 *   - `status`   — fixed vocabulary `stable | beta | experimental | deprecated`;
 *                  default `stable`.
 *
 * Idempotent: only fills a key that is **missing**, never clobbers an authored
 * value. Re-running is a no-op once every page is complete.
 *
 * A page counts as a rune page only if its basename matches a real rune in the
 * active package set (queried from the built CLI). That excludes concept pages
 * (surfaces, media-guests, rune-catalog), plugin overviews (index.md) and guide
 * pages (cli, workflow, examples) — the same parity the drift guardrail
 * (WORK-387) enforces.
 *
 * Usage:
 *   node scripts/backfill-rune-metadata.mjs            # write
 *   node scripts/backfill-rune-metadata.mjs --dry-run  # preview only
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, basename, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RUNES_DIR = join(ROOT, 'site/content/runes');
const LAYOUT = join(RUNES_DIR, '_layout.md');
const SITE = 'main';

export const STATUS_VOCABULARY = ['stable', 'beta', 'experimental', 'deprecated'];
const DEFAULT_STATUS = 'stable';

const PLUGIN_LABEL = {
	marketing: 'Marketing', docs: 'Docs', storytelling: 'Storytelling',
	places: 'Places', business: 'Business', learning: 'Learning',
	design: 'Design', media: 'Media', plan: 'Plan',
};

const dryRun = process.argv.includes('--dry-run');

/** The real rune names (plus aliases) in the active package set, from the CLI. */
function canonicalRuneNames() {
	const out = execFileSync(
		process.execPath,
		[join(ROOT, 'packages/cli/dist/bin.js'), 'inspect', '--list', '--site', SITE, '--json'],
		{ cwd: ROOT, encoding: 'utf8' },
	);
	const names = new Set();
	for (const rune of JSON.parse(out)) {
		names.add(rune.name);
		for (const alias of rune.aliases ?? []) names.add(alias);
	}
	return names;
}

/** Map each nav slug in `_layout.md` (e.g. `card`, `marketing/hero`) → its H2 group. */
function navCategories() {
	const map = new Map();
	let group = null;
	for (const line of readFileSync(LAYOUT, 'utf8').split('\n')) {
		const heading = line.match(/^##\s+(.+?)\s*$/);
		if (heading) { group = heading[1]; continue; }
		const item = line.match(/^-\s+(\S+)\s*$/);
		if (item && group && !item[1].startsWith('[')) map.set(item[1], group);
	}
	return map;
}

/** All `.md` files under runes/, excluding `_layout.md`. */
function runePages(dir = RUNES_DIR) {
	const out = [];
	for (const entry of readdirSync(dir)) {
		const abs = join(dir, entry);
		if (statSync(abs).isDirectory()) out.push(...runePages(abs));
		else if (entry.endsWith('.md') && entry !== '_layout.md') out.push(abs);
	}
	return out;
}

/** Render a YAML scalar — quote anything that isn't a bare word/path. */
function yamlValue(v) {
	return /^[A-Za-z0-9._/-]+$/.test(v) ? v : JSON.stringify(v);
}

/** Insert missing `key: value` pairs into a file's frontmatter block. Returns
 *  the new content and the list of keys added (empty when nothing changed). */
function fillFrontmatter(content, pairs) {
	const m = content.match(/^---\n([\s\S]*?)\n---(\n|$)/);
	if (!m) throw new Error('no frontmatter block');
	const body = m[1];
	const added = [];
	const additions = [];
	for (const [key, value] of pairs) {
		if (value == null) continue;
		if (new RegExp(`^${key}:`, 'm').test(body)) continue; // already present — never clobber
		additions.push(`${key}: ${yamlValue(value)}`);
		added.push(key);
	}
	if (additions.length === 0) return { content, added };
	const newBody = `${body}\n${additions.join('\n')}`;
	const newContent = `---\n${newBody}\n---${m[2]}${content.slice(m[0].length)}`;
	return { content: newContent, added };
}

function main() {
	const names = canonicalRuneNames();
	const categories = navCategories();

	let updated = 0, complete = 0;
	const skipped = [];
	const missingCategory = [];

	for (const file of runePages()) {
		const rel = relative(RUNES_DIR, file).split('\\').join('/');
		const slug = rel.replace(/\.md$/, '');
		const name = basename(slug);

		// Gate: only genuine runes get metadata (excludes index/concept/guide pages).
		if (!names.has(name)) { skipped.push(rel); continue; }

		const parts = slug.split('/');
		const plugin = parts.length > 1 ? parts[0] : 'core';
		let category = categories.get(slug);
		if (!category) {
			category = plugin === 'core' ? null : (PLUGIN_LABEL[plugin] ?? plugin);
			if (!category) missingCategory.push(rel);
		}

		const content = readFileSync(file, 'utf8');
		const { content: next, added } = fillFrontmatter(content, [
			['type', 'rune'],
			['category', category],
			['plugin', plugin],
			['status', DEFAULT_STATUS],
		]);

		if (added.length === 0) { complete++; continue; }
		if (!dryRun) writeFileSync(file, next);
		updated++;
		console.log(`${dryRun ? 'would update' : 'updated'} ${rel}  +[${added.join(', ')}]`);
	}

	console.log(`\n${dryRun ? 'DRY RUN — ' : ''}rune pages: ${updated} ${dryRun ? 'to update' : 'updated'}, ${complete} already complete, ${skipped.length} non-rune skipped`);
	if (missingCategory.length) {
		console.warn(`\n⚠ no nav category for: ${missingCategory.join(', ')} (add them to runes/_layout.md)`);
	}
}

main();
