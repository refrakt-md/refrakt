/**
 * Materialise every rune's attributes as data the doc pages render (SPEC-128).
 *
 * `site/content/_data/rune-attributes.json` is committed and diffable. It is
 * partitioned into four roots — `own`, `base`, `axesAvailable`,
 * `axesUnavailable` — so a page selects its rows with one binding:
 * `{% data root="own" where=$r %}` where `$r` is `"rune:snippet"`. The script
 * emits data rather than prose for the same reason
 * `generate-config-reference.mjs` does — the artifact a reviewer reads is the
 * field data, which is the part that can be wrong.
 *
 * **Iterate the configured sites**, because a site can carry a plugin another
 * lacks — and the failure is quiet: the artifact would simply be missing those
 * runes, and a freshness check still passes, since it matches what the generator
 * produced. `coverageGaps` is what catches that.
 *
 * In *this* repo the `main` site already loads every plugin including
 * `@refrakt-md/plan`, so `plan` is a strict subset and either site alone would
 * cover the catalogue. The iteration is insurance here rather than load-bearing;
 * the synthetic cases in the test file are what actually exercise the logic.
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
import { UNIVERSAL_AXIS_FACETS } from '@refrakt-md/transform';
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
 * rows against 515 — six times the artifact for a table nothing renders.
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

/**
 * One line of prose per axis, read from the facet contracts themselves.
 *
 * `UNIVERSAL_AXIS_FACETS` is the registry the structure contract already
 * describes itself from, so the axis prose on a rune page and the axis prose in
 * `refrakt contracts` are the same sentence with one author. Writing it again
 * here would be a second copy to keep true.
 */
export const AXIS_DESCRIPTIONS = Object.fromEntries(
	UNIVERSAL_AXIS_FACETS.map((facet) => [facet.axis, facet.contract.description]),
);

/** Axis-level rows: what a rune carries, and what it does not, with the reason. */
export function axisRowsForRune(rune) {
	const rows = [];
	for (const { axis } of rune.attributes.universalAvailable ?? []) {
		rows.push({
			rune: rune.name,
			axis,
			available: true,
			description: AXIS_DESCRIPTIONS[axis] ?? '',
			// The filter a page's subquery hands the `axisAttributes` partition.
			// Pre-formatted because `where` takes one string and the
			// preprocess-time resolver cannot concatenate `"axis:" + $row.axis`
			// (BUG-010) — the same reason the page-level binding is `"rune:card"`
			// rather than a bare name.
			query: `axis:${axis}`,
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
	const artifact = { own: [], base: [], axesAvailable: [], axesUnavailable: [], axisAttributes: [] };

	// One row per (axis, attribute) — keyed by **axis alone**, not (rune, axis).
	//
	// Measured across the full rune set: every axis's attribute records are
	// identical on every rune that carries it (0 of 12 vary). So this is 37 rows
	// rather than the 3105 a (rune, axis) keying would produce, and SPEC-128's
	// objection to carrying per-attribute universal data — "3081 rows against
	// 515" — does not apply once the duplication is factored out. It also means
	// a page's subquery filters on the axis alone and never needs the rune.
	const seenAxes = new Set();
	for (const name of names) {
		for (const { axis, attributes } of byName.get(name).rune.attributes.universalAvailable ?? []) {
			if (seenAxes.has(axis)) continue;
			seenAxes.add(axis);
			for (const [attrName, attr] of Object.entries(attributes)) {
				artifact.axisAttributes.push({
					axis,
					name: attrName,
					type: attr.matches?.length
						? attr.matches.map((v) => JSON.stringify(v)).join(' | ')
						: attr.type,
					required: attr.required === true,
					description: attr.description ?? '',
				});
			}
		}
	}
	artifact.axisAttributes.sort((a, b) => a.axis.localeCompare(b.axis) || a.name.localeCompare(b.name));

	for (const name of names) {
		const { rune } = byName.get(name);
		const page = pageForRune(name);
		for (const row of rowsForRune(rune)) {
			artifact[row.scope].push({ ...row, page });
		}
		for (const row of axisRowsForRune(rune)) {
			artifact[row.available ? 'axesAvailable' : 'axesUnavailable'].push({ ...row, page });
		}
	}
	return artifact;
}

/**
 * The four partitions, as `root` names.
 *
 * Partitioned rather than two arrays carrying a `scope` / `available`
 * discriminator so a page's query needs **one** binding. With a single
 * `attributes` array every call site would have to pass four pre-built filter
 * strings (`"rune:card scope:own"`, `"rune:card scope:base"`, …), because
 * `where` takes one string and the preprocess-time resolver cannot concatenate
 * (BUG-010). Partitioned, every query is `root="<partition>" where=$r` with
 * `$r` = `"rune:card"` — which is what SPEC-128 D1 wanted from the call site.
 */
export const PARTITIONS = ['own', 'base', 'axesAvailable', 'axesUnavailable', 'axisAttributes'];

/** Every attribute row across the partitions that carry them. */
export function allAttributeRows(artifact) {
	return [...artifact.own, ...artifact.base];
}

/** Every axis row across the partitions that carry them. */
export function allAxisRows(artifact) {
	return [...artifact.axesAvailable, ...artifact.axesUnavailable];
}

/** Runes present in a site's rune set but absent from the artifact. */
export function coverageGaps(sites, artifact) {
	const covered = new Set(allAttributeRows(artifact).map((r) => r.rune));
	const axisOnly = new Set(allAxisRows(artifact).map((r) => r.rune));
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
		`Wrote ${allAttributeRows(artifact).length} attribute rows and ${allAxisRows(artifact).length} axis rows `
		+ `across ${sites.length} site(s) — `
		+ PARTITIONS.map((p) => `${p}: ${artifact[p].length}`).join(', '),
	);
	return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	process.exit(main(process.argv.slice(2)));
}
