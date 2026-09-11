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
export const ARTIFACT_PATH = join(ROOT, 'site/content/_data/rune-attributes.json');
export const REGENERATE_COMMAND = 'npm run runes:attributes';

/**
 * Runes with no doc page of their own, mapped to the page their content belongs
 * on — a child rune to its parent, an internal rune to `null`.
 *
 * A Map rather than a Set because the parent has to be *data*: the coverage
 * check only needs to know a rune is pageless, but the attribute generator needs
 * to know which page a child's table lands on, and a comment cannot tell it
 * (SPEC-128 D5). `null` distinguishes "no table anywhere" from "documented on
 * the parent's page" — collapsing the two would put `error`'s attributes on some
 * arbitrary page.
 *
 * Update this when you add a child/internal rune; a new *top-level* rune must
 * instead get its own `/runes/<name>` page.
 */
export const PAGELESS = new Map([
	// Child runes → the page their attributes belong on. The value is the
	// parent *rune*, which resolves to `/runes/<parent>` (a plugin rune sits
	// under its plugin's directory, so the path is derived, not stored).
	['accordion-item', 'accordion'],
	['tab', 'tabs'],
	['conversation-message', 'conversation'],
	['note', 'annotate'],
	['reveal-step', 'reveal'],
	['budget-category', 'budget'],
	['budget-line-item', 'budget'],
	['form-field', 'form'],
	['bento-cell', 'bento'],
	['definition', 'feature'],
	['step', 'steps'],
	['tier', 'pricing'],
	['comparison-column', 'comparison'],
	['comparison-row', 'comparison'],
	['symbol-group', 'symbol'],
	['symbol-member', 'symbol'],
	['changelog-release', 'changelog'],
	['character-section', 'character'],
	['realm-section', 'realm'],
	['faction-section', 'faction'],
	['beat', 'plot'],
	['storyboard-panel', 'storyboard'],
	['map-pin', 'map'],
	['itinerary-day', 'itinerary'],
	['itinerary-stop', 'itinerary'],
	['cast-member', 'cast'],
	['timeline-entry', 'timeline'],

	// Internal — not authored directly, so their content belongs on no page at
	// all. `null` is a different answer from "documented on the parent's page",
	// and the generator must not confuse the two.
	['error', null],  // validation error reporting — never authored
	['region', null],  // layout — documented in layout.md
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

/**
 * Pages that still hand-write a table for a rune the artifact generates rows for
 * (WORK-548).
 *
 * The coverage checks above answer "do the pages and the runes agree?" for one
 * meaning of agree — every rune has a page. This answers the second: the page's
 * *content* comes from the schema rather than from a copy of it. A hand-written
 * table beside a generated one is the drift this whole item exists to remove,
 * and it re-appears the moment someone adds a row "just for now".
 *
 * Deliberately narrow. It only looks inside the `## Attributes` section, and
 * only flags a table there when the page also carries a generated include — a
 * page with no include at all is the *missing*-table case, which
 * `attributeCoverage` below reports separately with a different remedy.
 */
export function handWrittenTables(artifact, dir = RUNES_DIR) {
	const generated = new Set([...artifact.own, ...artifact.base].map((r) => r.page).filter(Boolean));
	const offenders = [];
	for (const [page, { rel }] of findDocPages(dir)) {
		if (!generated.has(page)) continue;
		const text = readFileSync(join(RUNES_DIR, rel), 'utf8');
		const m = /^(#{2,3}) Attributes\s*$/m.exec(text);
		if (!m) continue;
		const start = m.index + m[0].length;
		const rest = text.slice(start);
		const nxt = new RegExp(`^#{1,${m[1].length}} \\S`, 'm').exec(rest);
		const section = rest.slice(0, nxt ? nxt.index : undefined);
		if (!section.includes('rune-attributes.md')) continue;
		if (/^\|\s*-{2,}/m.test(section)) offenders.push(page);
	}
	return offenders;
}

/** Runes with generated rows whose page never renders them. */
export function attributeCoverage(artifact, dir = RUNES_DIR) {
	const byPage = new Map();
	for (const row of [...artifact.own, ...artifact.base]) {
		if (!row.page) continue;
		if (!byPage.has(row.page)) byPage.set(row.page, new Set());
		byPage.get(row.page).add(row.rune);
	}
	const files = new Map([...findDocPages(dir)].map(([page, { rel }]) => [page, join(RUNES_DIR, rel)]));
	const missing = [];
	for (const [page, runes] of byPage) {
		const file = files.get(page);
		if (!file) { missing.push(`${page} (no page file)`); continue; }
		const text = readFileSync(file, 'utf8');
		for (const rune of runes) {
			if (!text.includes(`variables={r: "rune:${rune}"}`)) missing.push(`${rune} (on /runes/${page})`);
		}
	}
	return missing.sort();
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

	// WORK-548 — the content half: the artifact is fresh, every rune with rows
	// renders them, and no page hand-writes a table beside a generated one.
	let artifact = null;
	try {
		artifact = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8'));
	} catch {
		failed = true;
		console.error(`✗ ${relative(ROOT, ARTIFACT_PATH)} is missing or unreadable.`);
		console.error(`    Run \`${REGENERATE_COMMAND}\` and commit the result.`);
	}

	if (artifact) {
		const uncovered = attributeCoverage(artifact);
		if (uncovered.length) {
			failed = true;
			console.error(`✗ ${uncovered.length} rune(s) have generated attribute rows no page renders:`);
			for (const n of uncovered) console.error(`    ${n}  — add {% include file="rune-attributes.md" variables={r: "rune:<name>"} /%}`);
		}

		const handWritten = handWrittenTables(artifact);
		if (handWritten.length) {
			failed = true;
			console.error(`✗ ${handWritten.length} page(s) hand-write an attribute table beside the generated one:`);
			for (const n of handWritten) console.error(`    ${n}  — delete the table; the include renders it from the schema`);
		}
	}

	if (failed) process.exit(1);
	console.log(`✓ rune docs in parity — every documentable rune has a page, every type: rune page has a backing rune,`);
	console.log(`  and every generated attribute table is rendered from the schema rather than copied`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
