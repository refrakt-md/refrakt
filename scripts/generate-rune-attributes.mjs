/**
 * Materialise every rune's attributes as data the doc pages render (SPEC-128).
 *
 * `site/content/_data/rune-attributes.json` is committed and diffable; each page
 * selects its own rows with `{% data … where="rune:snippet scope:own" %}`. The
 * script emits data rather than prose for the same reason
 * `generate-config-reference.mjs` does — the artifact a reviewer reads is the
 * field data, which is the part that can be wrong.
 *
 * **Iterate the configured sites.** The plan runes come from `@refrakt-md/plan`,
 * which is only in the `plan` site's plugin set, so a generator reading one site
 * emits a plausible artifact missing a third of the catalogue — and a naive
 * freshness check passes, because the artifact matches what the generator
 * produced. `coverageGaps` is what catches that.
 *
 * Usage:
 *   node scripts/generate-rune-attributes.mjs           # write the artifact
 *   node scripts/generate-rune-attributes.mjs --check   # exit 1 if stale
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { PAGELESS } from './check-rune-docs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'packages/cli/dist/bin.js');
export const ARTIFACT_PATH = join(ROOT, 'site/content/_data/rune-attributes.json');
export const REGENERATE_COMMAND = 'npm run runes:attributes';

/** Sites to read, from `refrakt.config.json`. */
export function configuredSites(root = ROOT) {
	const config = JSON.parse(readFileSync(join(root, 'refrakt.config.json'), 'utf8'));
	return Object.keys(config.sites ?? {});
}

/**
 * Every rune the named site knows, as `serializeRune` shapes them.
 *
 * `reference dump` writes to a file rather than stdout — `-o -` creates a file
 * literally named `-` — so this round-trips through a temp path.
 */
export function runesForSite(site, cliPath = CLI) {
	const out = join(tmpdir(), `refrakt-runes-${site}-${process.pid}.json`);
	try {
		execFileSync(
			process.execPath,
			[cliPath, 'reference', 'dump', '--format', 'json', '--site', site, '-o', out],
			{ cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'ignore', 'inherit'] },
		);
		return JSON.parse(readFileSync(out, 'utf8'));
	} finally {
		rmSync(out, { force: true });
	}
}

/**
 * Flatten one rune into attribute rows — `own` and `base` only.
 *
 * Universal attributes are deliberately absent. They are rendered as an axis
 * accordion that names each axis and links to its documentation, so the page
 * needs the axis rows below rather than a record per attribute (SPEC-128 D1,
 * "try the link-only form first"). Carrying them here instead would be 3081
 * rows against 512 — six times the artifact for a table nothing renders.
 */
export function rowsForRune(rune) {
	const rows = [];
	const push = (scope, name, attr, extra = {}) => {
		rows.push({
			rune: rune.name,
			plugin: rune.plugin,
			scope,
			name,
			type: attr.matches?.length
				? attr.matches.map((v) => JSON.stringify(v)).join(' | ')
				: attr.type,
			required: attr.required === true,
			description: attr.description ?? '',
			...extra,
		});
	};

	for (const [name, attr] of Object.entries(rune.attributes.own)) push('own', name, attr);
	if (rune.attributes.base) {
		for (const [name, attr] of Object.entries(rune.attributes.base.attributes)) {
			push('base', name, attr, { preset: rune.attributes.base.name });
		}
	}
	return rows;
}

/** Axis-level rows: what a rune carries, and what it does not, with the reason. */
export function axisRowsForRune(rune) {
	const rows = [];
	for (const { axis, attributes } of rune.attributes.universalAvailable ?? []) {
		rows.push({
			rune: rune.name,
			axis,
			available: true,
			attributes: Object.keys(attributes).join(', '),
		});
	}
	// Grouped by reason rather than one row per axis: no rune has more than
	// three distinct reasons, while `badge` has twelve unavailable axes sharing
	// one (SPEC-128 D1b).
	const byReason = new Map();
	for (const { axis, reason, attributes } of rune.attributes.universalUnavailable ?? []) {
		const label = attributes.includes(axis) ? axis : `${axis} (${attributes.join(', ')})`;
		const axes = byReason.get(reason);
		if (axes) axes.push(label);
		else byReason.set(reason, [label]);
	}
	for (const [reason, axes] of byReason) {
		rows.push({ rune: rune.name, available: false, axes: axes.join(', '), reason });
	}
	return rows;
}

/** Where a rune's attributes are documented: its own page, or a parent's. */
export function pageForRune(name) {
	if (!PAGELESS.has(name)) return name;
	return PAGELESS.get(name);
}

export function build(sites) {
	const byName = new Map();
	for (const { site, runes } of sites) {
		for (const rune of runes) {
			// A core rune appears in every site; keep the first and record that it
			// was seen, so the coverage check can tell "missing" from "duplicate".
			if (!byName.has(rune.name)) byName.set(rune.name, { rune, sites: [site] });
			else byName.get(rune.name).sites.push(site);
		}
	}

	const names = [...byName.keys()].sort();
	const attributes = [];
	const axes = [];
	for (const name of names) {
		const { rune } = byName.get(name);
		const page = pageForRune(name);
		for (const row of rowsForRune(rune)) attributes.push({ ...row, page });
		for (const row of axisRowsForRune(rune)) axes.push({ ...row, page });
	}
	return { attributes, axes };
}

/** Runes present in a site's rune set but absent from the artifact. */
export function coverageGaps(sites, artifact) {
	const covered = new Set(artifact.attributes.map((r) => r.rune));
	const axisOnly = new Set(artifact.axes.map((r) => r.rune));
	const gaps = [];
	for (const { site, runes } of sites) {
		for (const rune of runes) {
			const hasAttributes = Object.keys(rune.attributes.own).length > 0
				|| Object.keys(rune.attributes.base?.attributes ?? {}).length > 0;
			if (hasAttributes && !covered.has(rune.name)) gaps.push(`${site}:${rune.name}`);
			else if (!hasAttributes && !axisOnly.has(rune.name) && (rune.attributes.universalAvailable ?? []).length > 0) {
				gaps.push(`${site}:${rune.name} (axes)`);
			}
		}
	}
	return gaps;
}

export function render(artifact) {
	return JSON.stringify(artifact, null, '\t') + '\n';
}

export function readSites(cliPath = CLI) {
	return configuredSites().map((site) => ({ site, runes: runesForSite(site, cliPath) }));
}

function main(argv) {
	const sites = readSites();
	const artifact = build(sites);

	const gaps = coverageGaps(sites, artifact);
	if (gaps.length > 0) {
		console.error(`Runes missing from the artifact: ${gaps.join(', ')}`);
		return 1;
	}

	const rendered = render(artifact);

	if (argv.includes('--check')) {
		let current = '';
		try {
			current = readFileSync(ARTIFACT_PATH, 'utf8');
		} catch {
			/* missing counts as stale */
		}
		if (current !== rendered) {
			console.error('site/content/_data/rune-attributes.json is out of date.');
			console.error(`Run \`${REGENERATE_COMMAND}\` and commit the result.`);
			return 1;
		}
		console.log('✓ rune-attributes.json is up to date');
		return 0;
	}

	mkdirSync(dirname(ARTIFACT_PATH), { recursive: true });
	writeFileSync(ARTIFACT_PATH, rendered);
	console.log(
		`Wrote ${artifact.attributes.length} attribute rows and ${artifact.axes.length} axis rows `
		+ `across ${sites.length} site(s)`,
	);
	return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	process.exit(main(process.argv.slice(2)));
}
