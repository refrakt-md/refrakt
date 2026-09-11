import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
	ARTIFACT_PATH,
	REGENERATE_COMMAND,
	AXIS_DESCRIPTIONS,
	PARTITIONS,
	allAttributeRows,
	allAxisRows,
	configuredSites,
	rowsForRune,
	axisRowsForRune,
	pageForRune,
	build,
	coverageGaps,
	render,
	readSites,
} from './generate-rune-attributes.mjs';
import { PAGELESS } from './check-rune-docs.mjs';

/**
 * Same two-layer shape as the config-reference generator's tests: unit tests
 * over the pure flattening, then live checks against the real rune set and the
 * committed artifact.
 */

/** A rune as `serializeRune` shapes it, trimmed to what the generator reads. */
const rune = (name, over = {}) => ({
	name,
	plugin: 'core',
	attributes: {
		own: {},
		universalAvailable: [],
		universalUnavailable: [],
		...over,
	},
});

describe('rowsForRune', () => {
	it('flattens own attributes with type, requiredness and prose', () => {
		const rows = rowsForRune(rune('card', {
			own: { href: { type: 'string', required: false, description: 'Link target.' } },
		}));
		expect(rows).toEqual([{
			rune: 'card', plugin: 'core', scope: 'own', name: 'href',
			type: 'string', required: false, description: 'Link target.',
		}]);
	});

	it('renders a closed vocabulary as a union rather than "string"', () => {
		const [row] = rowsForRune(rune('card', {
			own: { height: { type: 'string', matches: ['sm', 'md'] } },
		}));
		expect(row.type).toBe('"sm" | "md"');
	});

	it('carries base-preset attributes with the preset that supplied them', () => {
		const rows = rowsForRune(rune('card', {
			base: { name: 'split layout', attributes: { valign: { type: 'string' } } },
		}));
		expect(rows).toEqual([{
			rune: 'card', plugin: 'core', scope: 'base', name: 'valign',
			type: 'string', required: false, description: '', preset: 'split layout',
		}]);
	});

	it('leaves universal attributes out — they are the axis rows\' job', () => {
		expect(rowsForRune(rune('card', {
			universalAvailable: [{ axis: 'tint', attributes: { tint: {} } }],
		}))).toEqual([]);
	});
});

describe('axisRowsForRune', () => {
	it('names the axis, its prose and the attributes it carries', () => {
		const [row] = axisRowsForRune(rune('card', {
			universalAvailable: [{ axis: 'tint', attributes: { tint: {}, 'tint-mode': {} } }],
		}));
		expect(row).toMatchObject({
			rune: 'card', axis: 'tint', available: true, attributes: 'tint, tint-mode',
		});
		expect(row.description).toMatch(/colour override/);
	});

	it('groups unavailable axes by reason rather than emitting one row each', () => {
		// `badge` has twelve unavailable axes sharing a single reason; as one row
		// per axis that section says "no" twelve times (SPEC-128 D1b).
		const rows = axisRowsForRune(rune('badge', {
			universalUnavailable: [
				{ axis: 'tint', reason: 'inline rune', attributes: ['tint'] },
				{ axis: 'bg', reason: 'inline rune', attributes: ['bg'] },
				{ axis: 'prominence', reason: 'no header', attributes: ['prominence'] },
			],
		}));
		expect(rows).toEqual([
			{ rune: 'badge', available: false, axes: 'tint, bg', reason: 'inline rune' },
			{ rune: 'badge', available: false, axes: 'prominence', reason: 'no header' },
		]);
	});

	it('spells out an axis whose attributes are not just its own name', () => {
		const [row] = axisRowsForRune(rune('badge', {
			universalUnavailable: [{ axis: 'motion', reason: 'inline rune', attributes: ['reveal', 'stagger'] }],
		}));
		expect(row.axes).toBe('motion (reveal, stagger)');
	});
});

describe('pageForRune', () => {
	it('sends a rune with a page of its own to that page', () => {
		expect(pageForRune('card')).toBe('card');
	});

	it('sends a child rune to its parent\'s page', () => {
		expect(pageForRune('accordion-item')).toBe('accordion');
	});

	it('sends an internal rune nowhere — not to some arbitrary page', () => {
		// `null` and "documented on the parent's page" are different answers, and
		// collapsing them would put `error`'s attributes somewhere at random.
		expect(pageForRune('error')).toBeNull();
	});
});

describe('coverageGaps', () => {
	const sites = () => [
		{ site: 'main', runes: [rune('card', { own: { href: { type: 'string' } } })] },
		{ site: 'plan', runes: [rune('work', { own: { id: { type: 'string' } } })] },
	];

	it('is silent when every rune made it into the artifact', () => {
		const all = sites();
		expect(coverageGaps(all, build(all))).toEqual([]);
	});

	it('catches a generator that read only one site', () => {
		// The failure this guards is quiet: reading only `main` drops every plan
		// rune, and a freshness check still passes because the artifact matches
		// what the generator produced. Only a coverage assertion catches it.
		const all = sites();
		const partial = build([all[0]]);
		expect(coverageGaps(all, partial)).toEqual(['plan:work']);
	});

	it('catches a rune dropped from the artifact for its axes alone', () => {
		const all = [{
			site: 'main',
			runes: [rune('tint', { universalAvailable: [{ axis: 'tint', attributes: { tint: {} } }] })],
		}];
		expect(coverageGaps(all, { own: [], base: [], axesAvailable: [], axesUnavailable: [] })).toEqual(['main:tint (axes)']);
	});
});

describe('build', () => {
	it('stamps every row with the page it belongs on', () => {
		const artifact = build([{
			site: 'main',
			runes: [rune('accordion-item', { own: { open: { type: 'boolean' } } })],
		}]);
		expect(artifact.own[0].page).toBe('accordion');
	});

	it('keeps one entry for a core rune present in every site', () => {
		const core = rune('card', { own: { href: { type: 'string' } } });
		const artifact = build([
			{ site: 'main', runes: [core] },
			{ site: 'plan', runes: [core] },
		]);
		expect(allAttributeRows(artifact)).toHaveLength(1);
	});

	it('partitions the rows into the four roots a page queries', () => {
		// The partitioning is the page contract: it is what lets a call site pass
		// one binding (`$r` = "rune:card") instead of four pre-built filter
		// strings, since `where` takes one string and cannot concatenate.
		const artifact = build([{
			site: 'main',
			runes: [rune('card', {
				own: { href: { type: 'string' } },
				base: { name: 'split layout', attributes: { valign: { type: 'string' } } },
				universalAvailable: [{ axis: 'tint', attributes: { tint: {} } }],
				universalUnavailable: [{ axis: 'prominence', reason: 'no header', attributes: ['prominence'] }],
			})],
		}]);
		expect(Object.keys(artifact)).toEqual(PARTITIONS);
		expect(artifact.own.map((r) => r.name)).toEqual(['href']);
		expect(artifact.base.map((r) => r.name)).toEqual(['valign']);
		expect(artifact.axesAvailable.map((r) => r.axis)).toEqual(['tint']);
		expect(artifact.axesUnavailable.map((r) => r.reason)).toEqual(['no header']);
	});

	it('keeps each partition single-purpose, so a query needs no second clause', () => {
		const artifact = build(readSites());
		expect(artifact.own.every((r) => r.scope === 'own')).toBe(true);
		expect(artifact.base.every((r) => r.scope === 'base')).toBe(true);
		expect(artifact.axesAvailable.every((r) => r.available === true)).toBe(true);
		expect(artifact.axesUnavailable.every((r) => r.available === false)).toBe(true);
	});

	it('sorts by rune name so the artifact is byte-stable across runs', () => {
		const runes = [
			rune('zebra', { own: { a: { type: 'string' } } }),
			rune('alpha', { own: { a: { type: 'string' } } }),
		];
		const forward = build([{ site: 'main', runes }]);
		const reversed = build([{ site: 'main', runes: [...runes].reverse() }]);
		expect(render(forward)).toBe(render(reversed));
		expect(forward.own.map((r) => r.rune)).toEqual(['alpha', 'zebra']);
	});
});

describe('against the real rune set', () => {
	const sites = readSites();
	const artifact = build(sites);

	it('reads every site in refrakt.config.json, not just the default', () => {
		expect(configuredSites()).toEqual(expect.arrayContaining(['main', 'plan']));
		expect(sites).toHaveLength(configuredSites().length);
	});

	it('covers the plan runes, which no site-less lookup reaches', () => {
		// `refrakt reference work --format json` reports "Unknown rune" with no
		// `--site` at all. WORK-548 assumed the fix was `--site plan`; measured,
		// this repo's `main` site already loads `@refrakt-md/plan`, so `plan` is
		// a strict *subset* of `main` and either site alone would cover these.
		// The multi-site iteration is still the right shape — a repo can have a
		// site carrying a plugin another lacks — but in this repo it is
		// insurance, not the thing that catches the gap. The synthetic
		// `coverageGaps` cases above are what actually exercise that logic.
		const covered = new Set(allAttributeRows(artifact).map((r) => r.rune));
		for (const name of ['spec', 'work', 'bug', 'decision', 'milestone']) {
			expect(covered).toContain(name);
		}
	});

	it('leaves no rune uncovered', () => {
		expect(coverageGaps(sites, artifact)).toEqual([]);
	});

	it('gives every carried axis prose from the facet contracts', () => {
		// A new universal axis that never reached `UNIVERSAL_AXIS_FACETS` would
		// render as a heading with nothing under it.
		const bare = artifact.axesAvailable.filter((r) => !r.description);
		expect(bare).toEqual([]);
	});

	it('sources that prose from the facets rather than a second copy here', () => {
		expect(AXIS_DESCRIPTIONS.tint).toMatch(/SPEC-053/);
		const tintRow = artifact.axesAvailable.find((r) => r.axis === 'tint');
		expect(tintRow.description).toBe(AXIS_DESCRIPTIONS.tint);
	});

	it('carries no internal `__`-prefixed attribute', () => {
		// `__deferred-body` reached `reference --format json` on `aggregate`,
		// `collection` and `relationships` before WORK-548 filtered it.
		expect(allAttributeRows(artifact).filter((r) => r.name.startsWith('__'))).toEqual([]);
	});

	it('routes each child rune\'s rows onto its parent\'s page', () => {
		for (const row of allAttributeRows(artifact)) {
			if (!PAGELESS.has(row.rune)) continue;
			expect(row.page).toBe(PAGELESS.get(row.rune));
		}
	});

	it('matches the committed artifact', () => {
		expect(readFileSync(ARTIFACT_PATH, 'utf8')).toBe(render(artifact));
	});

	it('names the command to run when it does not', () => {
		expect(REGENERATE_COMMAND).toBe('npm run runes:attributes');
	});
});
