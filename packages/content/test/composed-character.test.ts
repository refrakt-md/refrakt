import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import {
	tags as coreTags,
	collectJsonLd,
	defineComposedRune,
	extractSeo,
	parseFixture,
} from '@refrakt-md/runes';
import type { Plugin } from '@refrakt-md/types';
import { storytelling } from '../../../plugins/storytelling/src/index.js';
// The SEO baseline's own harvest, so the composed rune is measured exactly the
// way `contracts/seo-baseline/baseline.json` was.
import { harvest, normalize } from '../../../scripts/generate-seo-baseline.mjs';
import {
	all,
	capture,
	composedStorytelling as composedWith,
	definitionOf,
	find,
	fixtureOf,
	html,
	merge,
	pageContext,
	renderPage,
	snapshotPath,
	text,
	type Json,
} from './composed-storytelling.js';

/**
 * WORK-625 — `character` as a composed rune, against the SEO baseline: SPEC-145's
 * full worked example and its spike criterion, beside the storytelling plugin's
 * `character` and never in place of it (SPEC-147 D1).
 *
 * The definition, `fixtures/composed-storytelling/runes/character.md`, places
 * `card`, `details` and its declared `metadata` block (`{% metablock %}`,
 * WORK-630). It drops the `character-section` child rune: each H2 section is a
 * `{% details %}`, placed by an ordinary `{% slot name="sections" each %}` (D26).
 *
 * The gate is SPEC-147 D2's: not that there are no differences from the plugin,
 * but that every one is explained. Each is asserted below and recorded with its
 * reason in WORK-625's resolution.
 */

const CHARACTER = definitionOf('character');
const composedStorytelling = (): Plugin => composedWith({ character: CHARACTER });
const fixture = (scenario: string) => fixtureOf('character', scenario);

const ROOT = join(__dirname, '..', '..', '..');
const baselineFixture = readFileSync(
	join(ROOT, 'contracts', 'seo-baseline', 'fixtures', 'character.md'),
	'utf-8',
);
const baseline = JSON.parse(
	readFileSync(join(ROOT, 'contracts', 'seo-baseline', 'baseline.json'), 'utf-8'),
) as { fixtures: Array<{ fixture: string; jsonLd: Json; rendered: Json }> };
const recorded = baseline.fixtures.find((f) => f.fixture === 'character')!;

/** The baseline generator's harvest of a fixture, with `pkg` in the site. */
function harvestWith(pkg: Plugin, raw: string, file = 'character.md') {
	const { identity } = pageContext(pkg);
	const ctx = { tags: { ...coreTags, ...merge(pkg).tags }, identity };
	return harvest({ file, ...parseFixture(raw, file) }, ctx) as {
		jsonLd: Json;
		rendered: { jsonLd: Json; annotations: Json };
	};
}

/** The JSON-LD a page publishes, harvested before and after the engine. */
function graph(pkg: Plugin, source: string) {
	const { schemas, identity } = pageContext(pkg);
	const tree = Markdoc.transform(Markdoc.parse(source), {
		...schemas,
		variables: { generatedIds: new Set<string>(), path: '/p', headings: [] },
	} as never);
	const pre = extractSeo(tree as never, {}, '/p').jsonLd;
	const post = collectJsonLd(identity(JSON.parse(JSON.stringify(tree))) as never);
	return { pre: normalize(pre), post: normalize(post) };
}

/** The `character` a page renders. */
function render(pkg: Plugin, source: string): Json {
	return find(renderPage(pkg, source), (n) => n.attributes?.['data-rune'] === 'character');
}

const named = (tree: Json, name: string) => all(tree, (n) => n.attributes?.['data-name'] === name);

afterEach(() => {
	vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// The definition
// ---------------------------------------------------------------------------

describe('composed character — the definition', () => {
	it('declares a Person row with `image: portrait`, places `sections` with `each`, and the portrait and description preamble slots', () => {
		expect(CHARACTER).toMatch(
			/schema:\n {2}type: Person\n {2}properties: \{ name: name, role: jobTitle, portrait: image \}/,
		);
		expect(CHARACTER).toContain('{% slot name="sections" each %}');
		expect(CHARACTER).toContain('{% slot name="portrait" /%}');
		expect(CHARACTER).toContain('{% slot name="description" /%}');
		expect(CHARACTER).toContain('{% metablock name="metadata" /%}');
		// No child rune of its own: `character-section` is gone.
		expect(CHARACTER).not.toContain('character-section');
	});
});

// ---------------------------------------------------------------------------
// JSON-LD — against the `character` fixture in the SEO baseline
// ---------------------------------------------------------------------------

describe('composed character — JSON-LD against the SEO baseline (SPEC-147 D2)', () => {
	it('publishes the recorded graph exactly, at both harvest points', () => {
		const composed = harvestWith(composedStorytelling(), baselineFixture);
		expect(composed.jsonLd).toEqual(recorded.jsonLd);
		expect(composed.rendered.jsonLd).toEqual(recorded.rendered.jsonLd);
		expect(composed.jsonLd).toEqual([
			{
				'@context': 'https://schema.org',
				'@type': 'Person',
				jobTitle: 'antagonist',
				name: 'Veshra',
			},
		]);
	});

	it('carries `name` on a <meta> rather than on the title <span> — the one RDFa difference', () => {
		const composed = harvestWith(composedStorytelling(), baselineFixture);
		expect(recorded.rendered.annotations).toEqual([
			{
				element: 'article',
				typeof: 'Person',
				children: [
					{ element: 'span', property: 'name', text: 'Veshra' },
					{ element: 'meta', property: 'jobTitle', content: 'antagonist' },
				],
			},
		]);
		// `name` is an attribute and the title is template text, so the value
		// rides the field bag and is published as a <meta>, like `jobTitle`.
		expect(composed.rendered.annotations).toEqual([
			{
				element: 'article',
				typeof: 'Person',
				children: [
					{ element: 'meta', property: 'name', content: 'Veshra' },
					{ element: 'meta', property: 'jobTitle', content: 'antagonist' },
				],
			},
		]);
	});

	it('the plugin itself reproduces the recorded fixture — the control', () => {
		const plugin = harvestWith(storytelling, baselineFixture);
		expect(plugin.jsonLd).toEqual(recorded.jsonLd);
		expect(plugin.rendered).toEqual(recorded.rendered);
	});
});

// ---------------------------------------------------------------------------
// D10 — a content-derived property through a slot
// ---------------------------------------------------------------------------

describe('composed character — `image` from a slot-placed portrait (D10)', () => {
	it('reaches the entity in the graph, at both harvest points', () => {
		const { pre, post } = graph(composedStorytelling(), fixture('portrait'));
		const expected = [
			{
				'@context': 'https://schema.org',
				'@type': 'Person',
				image: 'veshra.jpg',
				jobTitle: 'antagonist',
				name: 'Veshra',
			},
		];
		expect(pre).toEqual(expected);
		expect(post).toEqual(expected);
	});

	it('is an explained difference: the plugin, whose row maps no portrait, publishes none', () => {
		const { pre } = graph(storytelling, fixture('portrait'));
		expect(pre).toEqual([
			{
				'@context': 'https://schema.org',
				'@type': 'Person',
				jobTitle: 'antagonist',
				name: 'Veshra',
			},
		]);
	});

	it("the portrait lands in card's media zone, unwrapped, carrying its slot name and the property", () => {
		const out = render(composedStorytelling(), fixture('portrait'));
		const [media] = named(out, 'media');
		expect(media.attributes['data-section']).toBe('media');
		const [img] = media.children;
		expect(img.name).toBe('img');
		expect(img.attributes).toMatchObject({
			src: 'veshra.jpg',
			'data-slot': 'portrait',
			property: 'image',
		});
		// No portrait, no media zone (D17's empty-zone guard).
		expect(named(render(composedStorytelling(), fixture('canonical')), 'media')).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// The registry — against the storytelling registry snapshot
// ---------------------------------------------------------------------------

describe('composed character — registration (SPEC-144, against the storytelling snapshot)', () => {
	it("reproduces the committed snapshot's registry exactly: registrations, name index, types, warnings", async () => {
		const { snapshot } = await capture(composedStorytelling());
		const committed = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
		for (const key of ['types', 'registrations', 'entityByName', 'warnings']) {
			// As text, so key order inside every data bag counts too.
			expect(JSON.stringify(snapshot[key]), key).toBe(JSON.stringify(committed[key]));
		}
	});

	it('loses the cross-links inside a character page: authored prose now sits in a placed rune', async () => {
		const { snapshot } = await capture(composedStorytelling());
		const committed = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
		// The plugin's `postProcess` links `**Name**` in prose but skips nested
		// runes, letting only the page's top-level rune through. The plugin's
		// character holds its prose directly; the composed one places it inside
		// `{% card %}`, which is nested, so the walk never reaches it.
		const lost = { ...committed.links };
		delete lost['/characters/aria'];
		delete lost['/characters/old-tom'];
		expect(snapshot.links).toEqual(lost);
		expect(committed.links['/characters/aria']).toEqual(['Veshra -> /characters/veshra']);
		expect(committed.links['/characters/old-tom']).toEqual(['Aldermere -> /realms/aldermere']);
	});

	it('registers the same entities, ids, data and aliases as the plugin', async () => {
		const composed = await capture(composedStorytelling());
		const plugin = await capture(storytelling);
		const characters = (s: { registrations: Array<{ type: string }> }) =>
			s.registrations.filter((r) => r.type === 'character');
		expect(characters(composed.snapshot)).toEqual(characters(plugin.snapshot));
		expect(characters(composed.snapshot).length).toBeGreaterThan(0);
		// Aliases resolve to the same entities through the name index.
		expect(composed.snapshot.entityByName).toEqual(plugin.snapshot.entityByName);
		expect(composed.index.get('The Bone Witch')?.sourceUrl).toBe('/characters/veshra');
	});
});

// ---------------------------------------------------------------------------
// The spike — the emitted tree against today's, every difference explained
// ---------------------------------------------------------------------------

describe('composed character — rendered tree against the plugin (SPEC-145 spike, SPEC-147 D2)', () => {
	const scenarios = ['canonical', 'portrait', 'body-and-sections'] as const;

	it('records both trees for the portrait fixture', () => {
		const plugin = html(render(storytelling, fixture('portrait')));
		const composed = html(render(composedStorytelling(), fixture('portrait')));
		expect({ plugin, composed }).toMatchInlineSnapshot(`
			{
			  "composed": "<article typeof="Person" data-role="antagonist" data-status="alive" data-rune="character" data-density="full"><div class="rf-card" data-media-position="top" data-rune="card" data-density="full"><div data-section="media" data-name="media" class="rf-card__media" data-guest-fit="clip"><img src="veshra.jpg" alt="Veshra" data-slot="portrait" property="image"></div><div data-name="content" class="rf-card__content"><div data-name="body" class="rf-card__body" data-section="body"><h1 id="veshra" data-name="title" class="rf-card__title">Veshra</h1><dl data-name="metadata" data-zone="metadata" data-zone-layout="definition-list" class="rf-card__metadata"><div data-name="row" data-field="role" class="rf-card__row"><dt data-meta-label="">Role</dt><dd><span class="rf-badge" data-meta-type="category">antagonist</span></dd></div><div data-name="row" data-field="status" class="rf-card__row"><dt data-meta-label="">Status</dt><dd><span class="rf-badge" data-meta-type="status" data-meta-sentiment="positive">alive</span></dd></div></dl><p data-slot="description">A necromancer raised in the shadow of the Ashen Spire.</p><details class="rf-details" data-elevation="flush" data-rune="details" data-density="full"><summary data-field="summary" data-name="summary" class="rf-details__summary">Backstory</summary><div data-name="body" class="rf-details__body"><p data-slot="sections">She discovered her gift young.</p></div></details></div></div></div><meta property="name" content="Veshra"><meta property="jobTitle" content="antagonist"></article>",
			  "plugin": "<article data-field="content-section" class="rf-character rf-character--antagonist rf-character--alive" typeof="Person" data-role="antagonist" data-status="alive" data-aliases="" data-tags="" data-elevation="flat" data-rune="character" data-density="full"><div data-name="portrait" class="rf-character__portrait" data-section="media" data-media="portrait" data-guest-fit="clip"><img src="veshra.jpg" alt="Veshra"></div><div data-name="content" class="rf-character__content"><header data-name="preamble" class="rf-character__preamble" data-section="preamble"><span data-name="name" property="name" class="rf-character__name" data-section="title">Veshra</span></header><dl data-name="metadata" data-zone="metadata" data-zone-layout="definition-list" class="rf-character__metadata"><div data-name="row" data-field="role" class="rf-character__row"><dt data-meta-label="">Role</dt><dd><span class="rf-badge" data-meta-type="category">antagonist</span></dd></div><div data-name="row" data-field="status" class="rf-character__row"><dt data-meta-label="">Status</dt><dd><span class="rf-badge" data-meta-type="status" data-meta-sentiment="positive">alive</span></dd></div></dl><div data-name="body" class="rf-character__body" data-section="body"><p>A necromancer raised in the shadow of the Ashen Spire.</p></div><div data-name="sections" class="rf-character__sections"><div data-field="section" class="rf-character-section" data-rune="character-section" data-density="full"><span data-name="name" class="rf-character-section__name">Backstory</span><div data-name="body" class="rf-character-section__body" data-section="body"><p>She discovered her gift young.</p></div></div></div></div><meta property="jobTitle" content="antagonist"></article>",
			}
		`);
	});

	it.each(scenarios)(
		'%s: identity — data-rune, typeof, role and status are the same',
		(scenario) => {
			const plugin = render(storytelling, fixture(scenario));
			const composed = render(composedStorytelling(), fixture(scenario));
			for (const attr of ['data-rune', 'typeof', 'data-role', 'data-status', 'data-density']) {
				expect(composed.attributes[attr]).toBe(plugin.attributes[attr]);
			}
			expect(composed.name).toBe(plugin.name);
		},
	);

	it.each(scenarios)(
		'%s: root classes and data-* attributes the composed rune does not carry',
		(scenario) => {
			const plugin = render(storytelling, fixture(scenario));
			const composed = render(composedStorytelling(), fixture(scenario));
			// No block, so no rf-* class (D2, D2a).
			expect(String(plugin.attributes.class)).toMatch(/^rf-character /);
			expect(composed.attributes.class).toBeUndefined();
			expect(html(composed)).not.toMatch(/rf-character/);
			// Only enum attributes and attributes a metaField reads become modifiers
			// of a generated config (D2a, WORK-630): `aliases` and `tags` are free
			// text that no block shows.
			expect(plugin.attributes).toHaveProperty('data-aliases');
			expect(plugin.attributes).toHaveProperty('data-tags');
			expect(composed.attributes).not.toHaveProperty('data-aliases');
			expect(composed.attributes).not.toHaveProperty('data-tags');
			// The plugin config's `defaultElevation: 'flat'` has no counterpart.
			expect(plugin.attributes['data-elevation']).toBe('flat');
			expect(composed.attributes).not.toHaveProperty('data-elevation');
			// The plugin publishes its root under `property: 'contentSection'`.
			expect(plugin.attributes['data-field']).toBe('content-section');
			expect(composed.attributes['data-field']).toBeUndefined();
		},
	);

	it.each(scenarios)(
		"%s: the metadata block renders as the plugin's does, under card's classes",
		(scenario) => {
			const unclassed = (n: Json): Json => {
				if (Array.isArray(n)) return n.map(unclassed);
				if (!n || typeof n !== 'object') return n;
				const { class: _c, ...attributes } = n.attributes ?? {};
				return { ...n, attributes, children: unclassed(n.children ?? []) };
			};
			const [mine] = named(render(composedStorytelling(), fixture(scenario)), 'metadata');
			const [theirs] = named(render(storytelling, fixture(scenario)), 'metadata');
			expect(unclassed(mine)).toEqual(unclassed(theirs));
			expect(mine.attributes.class).toBe('rf-card__metadata');
			expect(theirs.attributes.class).toBe('rf-character__metadata');
		},
	);

	it("the name is card's title heading, not a span in a preamble header", () => {
		const plugin = render(storytelling, fixture('canonical'));
		const composed = render(composedStorytelling(), fixture('canonical'));
		const [span] = named(plugin, 'name');
		expect(span.name).toBe('span');
		expect(named(plugin, 'preamble')[0].name).toBe('header');
		const [title] = named(composed, 'title');
		expect(title.name).toBe('h1');
		expect(text(title)).toBe('Veshra');
		expect(named(composed, 'preamble')).toEqual([]);
	});

	it('sections are `details`, with no `data-field="section"` (SPEC-147 D6)', () => {
		const plugin = render(storytelling, fixture('canonical'));
		const composed = render(composedStorytelling(), fixture('canonical'));
		expect(all(plugin, (n) => n.attributes?.['data-field'] === 'section')).toHaveLength(2);
		expect(all(plugin, (n) => n.attributes?.['data-rune'] === 'character-section')).toHaveLength(2);
		expect(html(composed)).not.toMatch(/data-field="section"/);
		expect(html(composed)).not.toMatch(/character-section/);
		const details = all(composed, (n) => n.attributes?.['data-rune'] === 'details');
		expect(details.map((d) => text(named(d, 'summary')[0]))).toEqual(['Backstory', 'Abilities']);
		// The section's content carries the slot's name; the `details` is the template's.
		expect(details.map((d) => named(d, 'body')[0].children[0].attributes['data-slot'])).toEqual([
			'sections',
			'sections',
		]);
		// No `sections` wrapper of the rune's own.
		expect(named(plugin, 'sections')).toHaveLength(1);
		expect(named(composed, 'sections')).toEqual([]);
	});

	it('body content written alongside sections renders, where the plugin discards it (SPEC-147 Finding 6, D6)', () => {
		const plugin = render(storytelling, fixture('body-and-sections'));
		const composed = render(composedStorytelling(), fixture('body-and-sections'));
		const note = "Aria's story begins after the fall of Aldermere.";
		expect(html(plugin)).not.toContain(note);
		expect(html(composed)).toContain(note);
		const [hint] = all(composed, (n) => n.attributes?.['data-rune'] === 'hint');
		expect(hint.attributes['data-slot']).toBe('body');
		// Both keep the lead description.
		expect(html(plugin)).toContain('A wanderer from the southern marches.');
		expect(html(composed)).toContain('A wanderer from the southern marches.');
	});

	it("the description is a slot-named paragraph in card's body, not a `body` wrapper of its own", () => {
		const plugin = render(storytelling, fixture('portrait'));
		const composed = render(composedStorytelling(), fixture('portrait'));
		const [body] = named(plugin, 'body').filter((n) => n.attributes.class === 'rf-character__body');
		expect(body.attributes['data-section']).toBe('body');
		const [p] = all(composed, (n) => n.attributes?.['data-slot'] === 'description');
		expect(p.name).toBe('p');
		expect(text(p)).toBe('A necromancer raised in the shadow of the Ashen Spire.');
	});

	it("the portrait leaves the root for card's media zone", () => {
		const plugin = render(storytelling, fixture('portrait'));
		const composed = render(composedStorytelling(), fixture('portrait'));
		const [portrait] = named(plugin, 'portrait');
		expect(plugin.children[0]).toBe(portrait);
		expect(portrait.attributes).toMatchObject({
			'data-section': 'media',
			'data-media': 'portrait',
		});
		expect(named(composed, 'portrait')).toEqual([]);
		const [card] = all(composed, (n) => n.attributes?.['data-rune'] === 'card');
		expect(card.children[0].attributes['data-name']).toBe('media');
	});
});

// ---------------------------------------------------------------------------
// SPEC-145's worked example as written — what the stored definition corrects
// ---------------------------------------------------------------------------

describe("SPEC-145's character example as written", () => {
	it('is rejected without `emitAttributes`: `$each.heading` names no field (D26)', () => {
		const withoutEmit = CHARACTER.replace('  emitAttributes: { heading: $heading }\n', '');
		expect(() => defineComposedRune('character', withoutEmit)).toThrow(
			"`$each.heading` names no field of slot `sections`. `$each` exposes exactly the content model's `emitAttributes` (none declared)",
		);
	});

	it('without a catch-all preamble field, content no field matches is dropped — and reported (WORK-631)', () => {
		const withoutBody = CHARACTER.replace(
			'    body:        { match: any, optional: true, greedy: true }\n',
			'',
		).replace('{% slot name="body" /%}\n\n', '');
		const pkg = composedWith({ character: withoutBody });
		const out = html(render(pkg, fixture('body-and-sections')));
		// D11 checks that every *field* is placed, not that every node a field
		// could have held is matched — so the hint still does not render…
		expect(out).not.toContain("Aria's story begins after the fall of Aldermere.");
		expect(out).toContain('She left home at sixteen.');
		// …but it no longer vanishes silently.
		expect(unmatched(pkg, fixture('body-and-sections'))).toEqual([
			{
				line: 1,
				level: 'warning',
				message:
					'{% hint %} at line 4 matches no content-model field of {% character %} and is dropped from the output',
			},
		]);
	});
});

describe('unmatched content (WORK-631)', () => {
	it('the stored definition, with its catch-all `body` field, reports nothing', () => {
		for (const scenario of ['canonical', 'portrait', 'body-and-sections']) {
			expect(unmatched(composedStorytelling(), fixture(scenario)), scenario).toEqual([]);
		}
	});
});

/** The `content-unmatched` findings `Markdoc.validate` raises for one page. */
function unmatched(pkg: Plugin, source: string) {
	const { schemas } = pageContext(pkg);
	return Markdoc.validate(Markdoc.parse(source), {
		...schemas,
		variables: { generatedIds: new Set<string>(), path: '/p', headings: [] },
	} as never)
		.filter((f) => f.error.id === 'content-unmatched')
		.map((f) => ({
			line: (f.lines?.[0] ?? -1) + 1,
			level: f.error.level,
			message: f.error.message,
		}));
}
