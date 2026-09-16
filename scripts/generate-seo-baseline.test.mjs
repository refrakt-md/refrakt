import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import {
	ARTIFACT_PATH,
	REGENERATE_COMMAND,
	EMITTING_RUNES,
	COVERED_BY_PARENT,
	DELIBERATELY_SILENT,
	allEmittingRunes,
	groupOf,
	pluginsForSite,
	coverageGaps,
	normalize,
	rdfaOutline,
	build,
	render,
} from './generate-seo-baseline.mjs';

/**
 * Unit tests over the pure helpers, then live assertions against the real
 * corpus. The live ones carry the weight: the baseline's whole value is that it
 * records today's output faithfully, and a fixture that quietly fails to
 * exercise its rune produces a *passing* generator and a worthless baseline.
 */

describe('normalize', () => {
	it('sorts object keys so key order cannot cause a false diff', () => {
		expect(Object.keys(normalize({ b: 1, a: 2, '@type': 3 }))).toEqual(['@type', 'a', 'b']);
	});

	it('sorts nested objects too', () => {
		const out = normalize({ outer: { z: 1, a: { y: 1, b: 2 } } });
		expect(Object.keys(out.outer)).toEqual(['a', 'z']);
		expect(Object.keys(out.outer.a)).toEqual(['b', 'y']);
	});

	it('preserves array order, because ordered sequences are part of the contract', () => {
		// itemListElement, step, track and recipeInstructions are ordered. A
		// reordering is a real defect and must still show as a diff.
		expect(normalize([{ position: 2 }, { position: 1 }])).toEqual([
			{ position: 2 },
			{ position: 1 },
		]);
	});

	it('leaves scalars alone', () => {
		expect(normalize('MusicPlaylist')).toBe('MusicPlaylist');
		expect(normalize(5)).toBe(5);
		expect(normalize(null)).toBe(null);
	});
});

describe('rdfaOutline', () => {
	const tag = (name, attributes, children = []) => ({ name, attributes, children });

	it('records a typed node with its property and text', () => {
		const tree = tag('div', { typeof: 'Person' }, [
			tag('span', { property: 'name' }, ['Alice Johnson']),
		]);
		expect(rdfaOutline(tree)).toEqual([
			{
				element: 'div',
				typeof: 'Person',
				children: [{ element: 'span', property: 'name', text: 'Alice Johnson' }],
			},
		]);
	});

	it('reads no value off an entity root or a nested entity', () => {
		// Only a `property` without `typeof` carries a value, matching
		// `collectProperties`. Giving an entity root the concatenated text of its
		// whole subtree would bloat the artifact and obscure every diff.
		const nested = tag('div', { typeof: 'Review' }, [
			tag('span', { property: 'author', typeof: 'Person' }, [
				tag('span', { property: 'name' }, ['Sarah Chen']),
			]),
		]);
		const [review] = rdfaOutline(nested);
		expect(review.text).toBeUndefined();
		expect(review.children[0].text).toBeUndefined();
		expect(review.children[0].children[0].text).toBe('Sarah Chen');
	});

	it('lifts annotated descendants through unannotated wrappers', () => {
		// The engine injects structural wrappers; they must not change the outline.
		const tree = tag('div', {}, [tag('div', {}, [tag('span', { property: 'name' }, ['X'])])]);
		expect(rdfaOutline(tree)).toEqual([{ element: 'span', property: 'name', text: 'X' }]);
	});

	it('prefers a machine-readable value over rendered text', () => {
		const meta = tag('meta', { property: 'duration', content: 'PT73S' }, ['1:13']);
		expect(rdfaOutline(meta)).toEqual([
			{ element: 'meta', property: 'duration', content: 'PT73S' },
		]);
	});

	it('reads href and src, matching what a distiller takes from a link or image', () => {
		expect(rdfaOutline(tag('a', { property: 'item', href: '/docs' }, ['Docs']))).toEqual([
			{ element: 'a', property: 'item', href: '/docs' },
		]);
		expect(rdfaOutline(tag('img', { property: 'image', src: '/a.png' }))).toEqual([
			{ element: 'img', property: 'image', src: '/a.png' },
		]);
	});

	it('skips a tree with no annotations at all', () => {
		expect(rdfaOutline(tag('p', {}, ['just prose']))).toEqual([]);
	});
});

describe('groupOf', () => {
	it('places a rune in the group that decides its migration shape', () => {
		expect(groupOf('gallery')).toBe('A');
		expect(groupOf('organization')).toBe('B');
		expect(groupOf('playlist')).toBe('C');
	});

	it('is undefined for a rune that emits nothing', () => {
		expect(groupOf('card')).toBeUndefined();
	});
});

describe('coverageGaps', () => {
	it('is silent when every rune is named by a fixture', () => {
		const entries = allEmittingRunes().map((rune) => ({ rune }));
		expect(coverageGaps(entries)).toEqual([]);
	});

	it('names a rune no fixture covers', () => {
		const entries = allEmittingRunes()
			.filter((r) => r !== 'playlist')
			.map((rune) => ({ rune }));
		expect(coverageGaps(entries)).toEqual(['playlist']);
	});

	it('accepts an internal rune covered by its parent', () => {
		// `breadcrumb-item` is not in the tag map — `breadcrumb` builds those nodes
		// itself — so no fixture can name it directly.
		expect(COVERED_BY_PARENT['breadcrumb-item']).toBe('breadcrumb');
		const entries = allEmittingRunes()
			.filter((r) => r !== 'breadcrumb-item')
			.map((rune) => ({ rune }));
		expect(coverageGaps(entries)).toEqual([]);
	});

	it('still reports an internal rune when its parent is missing too', () => {
		const entries = allEmittingRunes()
			.filter((r) => r !== 'breadcrumb-item' && r !== 'breadcrumb')
			.map((rune) => ({ rune }));
		// Reported in EMITTING_RUNES order, which groups by migration shape:
		// `breadcrumb-item` is Group B, `breadcrumb` is Group C.
		expect(coverageGaps(entries)).toEqual(['breadcrumb-item', 'breadcrumb']);
	});
});

describe('the rune set', () => {
	it('covers the 30 emitting runes SPEC-130 migrates', () => {
		expect(allEmittingRunes()).toHaveLength(30);
		expect(EMITTING_RUNES.A).toHaveLength(7);
		expect(EMITTING_RUNES.B).toHaveLength(14);
		expect(EMITTING_RUNES.C).toHaveLength(9);
	});

	it('names no rune twice', () => {
		expect(new Set(allEmittingRunes()).size).toBe(30);
	});

	it('reads the plugin list from config rather than hard-coding it', () => {
		// A plugin added to the site must reach the baseline; a hard-coded list
		// would leave its runes silently unbaselined.
		expect(pluginsForSite('main')).toEqual(expect.arrayContaining(['@refrakt-md/media']));
	});
});

describe('against the real corpus', () => {
	let artifact;
	beforeAll(async () => {
		artifact = await build();
	}, 120_000);

	it('leaves no rune unbaselined', () => {
		expect(artifact.coverageGaps).toEqual([]);
	});

	it('exercises every rune with at least one fixture', () => {
		const runes = new Set(artifact.fixtures.map((f) => f.rune));
		for (const rune of allEmittingRunes()) {
			if (COVERED_BY_PARENT[rune]) continue;
			expect(runes, `no fixture names ${rune}`).toContain(rune);
		}
	});

	it('emits no bare entity anywhere (D4)', () => {
		// Was "a bare entity for exactly the seven Group A runes", which is what
		// the corpus measured before WORK-567 applied D4. It is now the inverse,
		// and a stronger guard: `collectJsonLd` drops an entity that resolves to a
		// bare `@type`, so a bare one appearing here would mean the mechanism
		// stopped working — or, as before, that a fixture uses the wrong content
		// model and the rune found nothing to map.
		const bare = [];
		for (const f of artifact.fixtures) {
			for (const entity of f.jsonLd) {
				const props = Object.keys(entity).filter((k) => k !== '@type' && k !== '@context');
				if (props.length === 0) bare.push(`${f.fixture} (${entity['@type']})`);
			}
		}
		expect(bare).toEqual([]);
	});

	it('emits at least one entity per fixture, bar the runes that say nothing on purpose', () => {
		for (const f of artifact.fixtures) {
			if (DELIBERATELY_SILENT.includes(f.rune)) {
				expect(f.jsonLd, `${f.fixture} should publish nothing`).toEqual([]);
				continue;
			}
			expect(f.jsonLd.length, `${f.fixture} emitted no entity`).toBeGreaterThan(0);
		}
	});

	it('keeps Group A intact as a roster even though six of it went quiet', () => {
		// The group is SPEC-130's unit of migration, not a claim about output.
		// Losing a name from it would lose the fixture that records the silence.
		expect([...EMITTING_RUNES.A].sort()).toEqual([...DELIBERATELY_SILENT, 'symbol'].sort());
	});

	it('records BUG-013 as it stands, rather than as it should be', () => {
		const podcast = artifact.fixtures.find((f) => f.fixture === 'playlist.podcast');
		expect(podcast.jsonLd[0]['@type']).toBe('MusicPlaylist');
		expect(podcast.jsonLd[0].track[0]['@type']).toBe('MusicRecording');
		// The standalone rune ignores its own `type` the same way.
		const episode = artifact.fixtures.find((f) => f.fixture === 'track.episode');
		expect(episode.jsonLd[0]['@type']).toBe('MusicRecording');
	});

	it('publishes `NGO`, the type schema.org actually has (D2)', () => {
		// Was `records NonProfit, the type schema.org does not have`. WORK-568
		// corrected the enum, and the fixture writes `NGO`; nothing in the corpus
		// may reintroduce a type outside the vocabulary the enum claims to speak.
		const ngo = artifact.fixtures.find((f) => f.fixture === 'organization.nonprofit');
		expect(ngo.jsonLd[0]['@type']).toBe('NGO');
		const types = artifact.fixtures.flatMap((f) => f.jsonLd.map((e) => e['@type']));
		expect(types).not.toContain('NonProfit');
	});

	it('pins D6 — a declared list is an array whatever the item count', () => {
		// `appendToProperty` stores the first value as a scalar and only promotes
		// on the second, so before a rune declares its collection a list, the
		// *shape* of its output varies with the amount of content and every
		// consumer has to handle both. Each pair diverges until the rune migrates
		// and converges after — so a pair moving from `pending` to `declared` is
		// what landing D6 for that rune looks like.
		const declared = [['pricing.single', 'pricing.tiers', 'offers']];
		const pending = [
			['breadcrumb.single', 'breadcrumb', 'itemListElement'],
			['timeline.single', 'timeline.entries', 'itemListElement'],
			['playlist.single', 'playlist.album', 'track'],
			['accordion.single', 'accordion', 'mainEntity'],
			['howto.single', 'howto', 'step'],
			['recipe.single', 'recipe', 'recipeIngredient'],
		];

		const shape = (name, property) => {
			const fixture = artifact.fixtures.find((f) => f.fixture === name);
			expect(fixture, `missing fixture ${name}`).toBeTruthy();
			return Array.isArray(fixture.jsonLd[0][property]);
		};

		for (const [singleName, multiName, property] of declared) {
			expect(shape(singleName, property), `${singleName}.${property} should be an array`).toBe(
				true,
			);
			expect(shape(multiName, property), `${multiName}.${property} should be an array`).toBe(true);
		}
		for (const [singleName, multiName, property] of pending) {
			expect(
				shape(singleName, property),
				`${singleName}.${property} is still a scalar — move this pair to \`declared\``,
			).toBe(false);
			expect(shape(multiName, property), `${multiName}.${property} should be an array`).toBe(true);
		}
	});

	it('captures the rendered RDFa alongside the JSON-LD, for WORK-563 to compare', () => {
		for (const f of artifact.fixtures) {
			expect(f.rendered.jsonLd, `${f.fixture} has no post-engine JSON-LD`).toBeTruthy();
			// A rune that publishes nothing stamps nothing: dropping the type also
			// removed the `typeof` from the HTML, so the RDFa channel goes quiet
			// with the JSON-LD rather than keeping a bare assertion in the markup.
			const expected = DELIBERATELY_SILENT.includes(f.rune) ? 0 : 1;
			expect(
				f.rendered.annotations.length,
				`${f.fixture} rendered ${f.rendered.annotations.length} RDFa nodes`,
			).toBeGreaterThanOrEqual(expected);
			if (expected === 0) expect(f.rendered.annotations).toEqual([]);
		}
	});

	it('finds the two harvest points already agree at rune level', () => {
		// WORK-563 moves the harvest after the pipeline and asserts both points
		// agree. Measured here across the whole corpus with keys normalised: they
		// already do, so that item's invariant is a regression net rather than a
		// migration. The page-level case is the one that currently fails, on
		// `{% breadcrumb auto=true %}`, and it belongs with the harvest move.
		for (const f of artifact.fixtures) {
			expect(f.rendered.jsonLd, `${f.fixture} drifts between harvest points`).toEqual(f.jsonLd);
		}
	});

	it('is byte-stable across runs', async () => {
		const again = await build();
		expect(render(again)).toBe(render(artifact));
	}, 120_000);

	it('matches the committed artifact', () => {
		expect(readFileSync(ARTIFACT_PATH, 'utf8')).toBe(render(artifact));
	});

	it('names the command to run when it does not', () => {
		expect(REGENERATE_COMMAND).toBe('npm run seo:baseline');
	});
});
