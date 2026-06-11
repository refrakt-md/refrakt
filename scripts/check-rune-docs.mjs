#!/usr/bin/env node
/**
 * Rune-doc drift guardrail (WORK-387, SPEC-092).
 *
 * Frontmatter-driven catalogues drift from code: add a `defineRune` /
 * `Plugin.runes` entry without a `/runes/<name>` page and it silently vanishes
 * from the generated catalogue; rename a rune and its old page becomes an
 * orphan. This turns both into a build signal:
 *
 *   - **Coverage** — every documentable rune in the active package set has a
 *     `/runes/<name>` doc page (carrying `type: rune`, per WORK-385).
 *   - **Orphans** — every page that declares `type: rune` has a backing rune.
 *
 * Child runes (documented inside a parent's page) and internal runes have no
 * page of their own; they're listed in {@link PAGELESS}, the maintained
 * "known gaps" set — the same pattern as lumina's `KNOWN_MISSING_SELECTORS`.
 * Adding a rune without a page, and without listing it here, is a deliberate
 * (reviewed) failure that names the rune.
 *
 * Usage:
 *   node scripts/check-rune-docs.mjs        # exit 1 on drift, naming each rune
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, basename, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RUNES_DIR = join(ROOT, 'site/content/runes');
export const CLI_PATH = join(ROOT, 'packages/cli/dist/bin.js');
const SITE = 'main';

/**
 * Runes with no doc page of their own — child runes documented inside a parent's
 * page, plus internal runes never authored directly. Each is annotated with its
 * parent. Update this set when you add a child/internal rune; a new *top-level*
 * rune must instead get its own `/runes/<name>` page.
 */
export const PAGELESS = new Set([
	// child runes — documented within their parent rune's page
	'accordion-item',                        // accordion
	'tab',                                   // tabs
	'conversation-message',                  // conversation
	'note',                                  // annotate
	'reveal-step',                           // reveal
	'budget-category', 'budget-line-item',   // budget
	'form-field',                            // form
	'bento-cell',                            // marketing/bento
	'definition',                            // marketing/feature
	'step',                                  // marketing/steps
	'tier',                                  // marketing/pricing
	'comparison-column', 'comparison-row',   // marketing/comparison
	'symbol-group', 'symbol-member',         // docs/symbol
	'changelog-release',                     // docs/changelog
	'character-section',                     // storytelling/character
	'realm-section',                         // storytelling/realm
	'faction-section',                       // storytelling/faction
	'beat',                                  // storytelling/plot
	'storyboard-panel',                      // storytelling/storyboard
	'map-pin',                               // places/map
	'itinerary-day', 'itinerary-stop',       // places/itinerary
	'cast-member',                           // business/cast
	'timeline-entry',                        // business/timeline
	// internal — not authored directly in content
	'error',                                 // validation error reporting
	'region',                                // layout (documented in layout.md)
]);

/** The active package set's runes + aliases, from the built CLI. */
export function loadPackageRunes(cliPath = CLI_PATH) {
	const out = execFileSync(
		process.execPath,
		[cliPath, 'inspect', '--list', '--site', SITE, '--json'],
		{ cwd: ROOT, encoding: 'utf8' },
	);
	const names = new Set();
	const aliases = new Set();
	for (const rune of JSON.parse(out)) {
		names.add(rune.name);
		for (const alias of rune.aliases ?? []) aliases.add(alias);
	}
	return { names, aliases };
}

/** Every `.md` page under runes/ → `{ rel, isRune }` keyed by basename.
 *  `isRune` reflects the `type: rune` frontmatter WORK-385 backfills. */
export function findDocPages(dir = RUNES_DIR) {
	const pages = new Map();
	const walk = (d) => {
		for (const entry of readdirSync(d)) {
			const abs = join(d, entry);
			if (statSync(abs).isDirectory()) { walk(abs); continue; }
			if (!entry.endsWith('.md') || entry === '_layout.md') continue;
			const fm = readFileSync(abs, 'utf8').match(/^---\n([\s\S]*?)\n---/);
			const isRune = !!fm && /^type:\s*rune\s*$/m.test(fm[1]);
			pages.set(basename(entry, '.md'), { rel: relative(RUNES_DIR, abs).split('\\').join('/'), isRune });
		}
	};
	walk(dir);
	return pages;
}

/**
 * Diff the package's runes against the doc pages.
 * @returns `{ missing, orphans, mislabelled }` — each an array naming the rune.
 */
export function computeDrift({ names, aliases }, docPages, pageless = PAGELESS) {
	const missing = [];      // documentable rune with no doc page
	const orphans = [];      // page declares `type: rune` but no backing rune
	const mislabelled = [];  // rune has a page, but the page lacks `type: rune`

	for (const name of names) {
		if (aliases.has(name) || pageless.has(name)) continue;
		const page = docPages.get(name);
		if (!page) missing.push(name);
		else if (!page.isRune) mislabelled.push(name);
	}

	for (const [name, page] of docPages) {
		if (page.isRune && !names.has(name)) orphans.push(page.rel);
	}

	return {
		missing: missing.sort(),
		orphans: orphans.sort(),
		mislabelled: mislabelled.sort(),
	};
}

function main() {
	if (!existsSync(CLI_PATH)) {
		console.error(`Error: ${relative(ROOT, CLI_PATH)} not found — run \`npm run build\` first.`);
		process.exit(2);
	}

	const { missing, orphans, mislabelled } = computeDrift(loadPackageRunes(), findDocPages());

	let failed = false;
	if (missing.length) {
		failed = true;
		console.error(`✗ ${missing.length} rune(s) have no /runes/<name> doc page:`);
		for (const n of missing) console.error(`    ${n}  — add site/content/runes/.../${n}.md, or add "${n}" to PAGELESS if it's a child/internal rune`);
	}
	if (orphans.length) {
		failed = true;
		console.error(`✗ ${orphans.length} doc page(s) declare type: rune but have no backing rune:`);
		for (const rel of orphans) console.error(`    ${rel}  — the rune was renamed or removed`);
	}
	if (mislabelled.length) {
		failed = true;
		console.error(`✗ ${mislabelled.length} rune doc page(s) are missing \`type: rune\` frontmatter:`);
		for (const n of mislabelled) console.error(`    ${n}  — run \`node scripts/backfill-rune-metadata.mjs\``);
	}

	if (failed) process.exit(1);
	console.log(`✓ rune docs in parity — every documentable rune has a page, every type: rune page has a backing rune`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
