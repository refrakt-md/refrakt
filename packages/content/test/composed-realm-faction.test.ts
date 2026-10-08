import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
// The SEO baseline's own harvest, so the composed runes are measured exactly the
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
 * WORK-636 — `realm` and `faction` as composed runes, beside the storytelling
 * plugin's and never in place of them (SPEC-147 D1).
 *
 * Both definitions (`fixtures/composed-storytelling/runes/{realm,faction}.md`)
 * have `character`'s shape: `card` with the scene in its media zone, the name as
 * card's title, the declared `metadata` block placed with `{% metablock %}`, the
 * description, a catch-all `body` (WORK-631 has not landed), and each H2 section
 * as a `{% details %}` placed by `{% slot name="sections" each %}`. The
 * `realm-section` and `faction-section` child runes are gone.
 *
 * SPEC-147 says their split maps to `{% mediatext %}`. Measured, it does not:
 * the last block below records why, and the definitions place `card` (SPEC-145
 * D18's canonical split primitive) instead.
 *
 * The gate is SPEC-147 D2's: every difference from the plugin is explained.
 * Each is asserted below and recorded with its reason in WORK-636's resolution.
 */

type Rune = 'realm' | 'faction';

const RUNES = {
	realm: {
		schemaType: 'Place',
		row: '{ name: name, type: additionalType, scene: image }',
		typeKey: 'realmType',
		aliases: ['location', 'place'],
		// Every non-name attribute the plugin publishes as a root data-* attribute,
		// with what the composed rune does with it.
		dataOnlyInPlugin: ['data-realm-type', 'data-tags', 'data-parent'],
		sameData: ['data-scale'],
		baselineName: 'Rivendell',
	},
	faction: {
		schemaType: 'Organization',
		row: '{ name: name, scene: image }',
		typeKey: 'factionType',
		aliases: ['guild', 'order'],
		dataOnlyInPlugin: ['data-faction-type', 'data-tags'],
		sameData: ['data-alignment', 'data-size'],
		baselineName: 'The Silver Order',
	},
} as const;

const RUNE_NAMES = Object.keys(RUNES) as Rune[];
const definitions = { realm: definitionOf('realm'), faction: definitionOf('faction') };
const composed = (rune: Rune): Plugin => composedWith({ [rune]: definitions[rune] });
const fixture = (rune: Rune, scenario: string) => fixtureOf(rune, scenario);

const ROOT = join(__dirname, '..', '..', '..');
const baselineFixture = (rune: Rune) =>
	readFileSync(join(ROOT, 'contracts', 'seo-baseline', 'fixtures', `${rune}.md`), 'utf-8');
const baseline = JSON.parse(
	readFileSync(join(ROOT, 'contracts', 'seo-baseline', 'baseline.json'), 'utf-8'),
) as { fixtures: Array<{ fixture: string; jsonLd: Json; rendered: Json }> };
const recorded = (rune: Rune) => baseline.fixtures.find((f) => f.fixture === rune)!;
const committed = () => JSON.parse(readFileSync(snapshotPath, 'utf-8'));

/** The baseline generator's harvest of a fixture, with `pkg` in the site. */
function harvestWith(pkg: Plugin, rune: Rune) {
	const file = `${rune}.md`;
	const { identity } = pageContext(pkg);
	const ctx = { tags: { ...coreTags, ...merge(pkg).tags }, identity };
	return harvest({ file, ...parseFixture(baselineFixture(rune), file) }, ctx) as {
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

/** The rune a page renders. */
function render(pkg: Plugin, rune: Rune, source: string): Json {
	return find(renderPage(pkg, source), (n) => n.attributes?.['data-rune'] === rune);
}

const named = (tree: Json, name: string) => all(tree, (n) => n.attributes?.['data-name'] === name);

/** Drop `class` everywhere in a tree. */
const unclassed = (n: Json): Json => {
	if (Array.isArray(n)) return n.map(unclassed);
	if (!n || typeof n !== 'object') return n;
	const { class: _c, ...attributes } = n.attributes ?? {};
	return { ...n, attributes, children: unclassed(n.children ?? []) };
};

/** A one-page site holding `source`, captured with `pkg`. */
async function captureOne(pkg: Plugin, source: string) {
	const dir = mkdtempSync(join(tmpdir(), 'composed-realm-faction-'));
	try {
		writeFileSync(join(dir, 'index.md'), `---\ntitle: One\n---\n\n${source}`);
		return await capture(pkg, dir);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

afterEach(() => {
	vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// The definitions
// ---------------------------------------------------------------------------

describe.each(RUNE_NAMES)('composed %s — the definition', (rune) => {
	const def = definitions[rune];
	const spec = RUNES[rune];

	it('declares its schema row, places `sections` with `each`, and places its meta block with `{% metablock %}`', () => {
		expect(def).toContain(`schema:\n  type: ${spec.schemaType}\n  properties: ${spec.row}`);
		expect(def).toContain('{% slot name="sections" each %}');
		expect(def).toContain('{% details summary=$each.heading %}');
		expect(def).toContain('{% slot name="scene" /%}');
		expect(def).toContain('{% metablock name="metadata" /%}');
		// No child rune of its own, and no placed badge or deflist for metadata.
		expect(def).not.toContain(`${rune}-section`);
		expect(def).not.toMatch(/\{% (badge|deflist|bar)\b/);
		// The split is `card`'s, not `mediatext`'s (see the last block).
		expect(def).toMatch(/^\{% card media-position=\$attrs\["media-position"\]/m);
		expect(def).not.toContain('mediatext');
	});

	it('accepts the same attributes as the plugin, less `prominence` and the `frame` family', () => {
		const attributes = (pkg: Plugin) => Object.keys(merge(pkg).tags[rune].attributes ?? {}).sort();
		// Universal attributes are offered by section role (SPEC-125 Phase 3).
		// The plugin's `sections` maps `name` to `title`, a header-ish role, so it
		// is offered `prominence`; its `mediaSlots: { scene: 'cover' }` makes it a
		// media surface, so it is offered `frame-*`. A composition declares
		// neither. The split attributes are declared by hand: `base` is not a
		// definition key.
		const missing = attributes(storytelling).filter((a) => !attributes(composed(rune)).includes(a));
		expect(missing).toEqual([
			'frame',
			'frame-anchor',
			'frame-aspect',
			'frame-displace',
			'frame-displace-mode',
			'frame-offset',
			'frame-overflow',
			'frame-oversize',
			'frame-place',
			'frame-shadow',
			'prominence',
		]);
		expect(attributes(composed(rune)).filter((a) => !attributes(storytelling).includes(a))).toEqual(
			[],
		);
		for (const a of ['media-position', 'media-ratio', 'valign', 'collapse', 'reading']) {
			expect(attributes(composed(rune))).toContain(a);
		}
	});

	it('answers to the plugin’s aliases', async () => {
		for (const alias of spec.aliases) {
			const source = fixture(rune, 'defaults')
				.replaceAll(`{% ${rune}`, `{% ${alias}`)
				.replace(`{% /${rune}`, `{% /${alias}`);
			const mine = await captureOne(composed(rune), source);
			const theirs = await captureOne(storytelling, source);
			expect(mine.snapshot.registrations).toEqual(theirs.snapshot.registrations);
			expect(mine.snapshot.registrations).toHaveLength(1);
			expect(mine.snapshot.registrations[0].type).toBe(rune);
		}
	});
});

// ---------------------------------------------------------------------------
// JSON-LD — against each rune's fixture in the SEO baseline
// ---------------------------------------------------------------------------

describe.each(RUNE_NAMES)(
	'composed %s — JSON-LD against the SEO baseline (SPEC-147 D2)',
	(rune) => {
		it('publishes the recorded graph exactly, at both harvest points, scene image included', () => {
			const out = harvestWith(composed(rune), rune);
			expect(out.jsonLd).toEqual(recorded(rune).jsonLd);
			expect(out.rendered.jsonLd).toEqual(recorded(rune).rendered.jsonLd);
			expect(out.jsonLd[0].image).toMatch(/^https:\/\/assets\.refrakt\.md\//);
		});

		it('carries `name` on a <meta> rather than on the title <span> — the one RDFa difference', () => {
			const out = harvestWith(composed(rune), rune);
			const theirs = recorded(rune).rendered.annotations;
			const swap = (a: Json) => a.element === 'span' && a.property === 'name';
			const nameSpan = theirs[0].children.find(swap);
			expect(nameSpan).toEqual({
				element: 'span',
				property: 'name',
				text: RUNES[rune].baselineName,
			});
			// The name is an attribute and the title is template text, so the value
			// rides the field bag and is published as a <meta>. Every other node,
			// the scene <img> included, is published exactly as recorded.
			expect(out.rendered.annotations).toEqual([
				{
					...theirs[0],
					children: theirs[0].children.map((c: Json) =>
						swap(c) ? { element: 'meta', property: 'name', content: c.text } : c,
					),
				},
			]);
		});

		it('the plugin itself reproduces the recorded fixture — the control', () => {
			const plugin = harvestWith(storytelling, rune);
			expect(plugin.jsonLd).toEqual(recorded(rune).jsonLd);
			expect(plugin.rendered).toEqual(recorded(rune).rendered);
		});

		it('with every optional attribute unset, publishes what the plugin publishes', () => {
			const mine = graph(composed(rune), fixture(rune, 'defaults'));
			const theirs = graph(storytelling, fixture(rune, 'defaults'));
			expect(mine).toEqual(theirs);
		});
	},
);

describe('composed realm — `type` defaults to `place`, as the plugin’s `realmType` meta does', () => {
	it('publishes `additionalType: "place"` when no type is written', () => {
		const { pre, post } = graph(composed('realm'), fixture('realm', 'defaults'));
		const expected = [
			{
				'@context': 'https://schema.org',
				'@type': 'Place',
				additionalType: 'place',
				name: 'The Waste',
			},
		];
		expect(pre).toEqual(expected);
		expect(post).toEqual(expected);
	});
});

// ---------------------------------------------------------------------------
// The registry — against the storytelling registry snapshot
// ---------------------------------------------------------------------------

describe('composed realm and faction — registration (SPEC-144, against the storytelling snapshot)', () => {
	it.each(RUNE_NAMES)(
		"%s: reproduces the committed snapshot's registrations, name index, types and warnings exactly",
		async (rune) => {
			const { snapshot } = await capture(composed(rune));
			for (const key of ['types', 'registrations', 'entityByName', 'warnings']) {
				// As text, so key order inside every data bag counts too.
				expect(JSON.stringify(snapshot[key]), key).toBe(JSON.stringify(committed()[key]));
			}
		},
	);

	it('with all four composed runes in one site, the registry is still the snapshot’s', async () => {
		const { snapshot } = await capture(
			composedWith({
				bond: definitionOf('bond'),
				character: definitionOf('character'),
				realm: definitionOf('realm'),
				faction: definitionOf('faction'),
			}),
		);
		for (const key of ['types', 'registrations', 'entityByName', 'warnings']) {
			expect(JSON.stringify(snapshot[key]), key).toBe(JSON.stringify(committed()[key]));
		}
	});

	it.each(RUNE_NAMES)(
		'%s: registers the same entities, ids and data as the plugin',
		async (rune) => {
			const mine = await capture(composed(rune));
			const theirs = await capture(storytelling);
			const of = (s: { registrations: Array<{ type: string }> }) =>
				s.registrations.filter((r) => r.type === rune);
			expect(of(mine.snapshot)).toEqual(of(theirs.snapshot));
			expect(of(mine.snapshot)).toHaveLength(1);
			expect(mine.snapshot.entityByName).toEqual(theirs.snapshot.entityByName);
		},
	);

	it.each(RUNE_NAMES)(
		'%s: registers the same data bag when every optional attribute is unset',
		async (rune) => {
			const mine = await captureOne(composed(rune), fixture(rune, 'defaults'));
			const theirs = await captureOne(storytelling, fixture(rune, 'defaults'));
			expect(JSON.stringify(mine.snapshot.registrations)).toBe(
				JSON.stringify(theirs.snapshot.registrations),
			);
		},
	);

	it('realm: keeps the character written inside it, registered from the realm’s page', async () => {
		// `aldermere.md` nests `{% character name="King Edric" %}` in the realm's
		// preamble. The plugin matches it as an `items` tag; the composed realm
		// places it through the catch-all `body` slot, inside `card`.
		const { snapshot } = await capture(composed('realm'));
		const edric = snapshot.registrations.find((r: Json) => r.id === 'King Edric');
		expect(edric).toMatchObject({ type: 'character', sourceUrl: '/realms/aldermere' });
	});

	it("realm: the snapshot's links are unchanged — no link was ever made inside a realm page", async () => {
		const { snapshot } = await capture(composed('realm'));
		expect(snapshot.links).toEqual(committed().links);
		expect(committed().links).not.toHaveProperty('/realms/aldermere');
	});

	it('faction: loses the cross-link inside its page — the prose now sits in a placed `card`', async () => {
		const { snapshot } = await capture(composed('faction'));
		// As for `character` (WORK-625, SPEC-147 Finding 4): the plugin's
		// `postProcess` skips nested runes, and the composed faction's prose is
		// inside `{% card %}`.
		const lost = { ...committed().links };
		delete lost['/factions/silver'];
		expect(snapshot.links).toEqual(lost);
		expect(committed().links['/factions/silver']).toEqual(['King Edric -> /realms/aldermere']);
	});
});

// ---------------------------------------------------------------------------
// The rendered tree against the plugin's, every difference explained
// ---------------------------------------------------------------------------

describe.each(RUNE_NAMES)(
	'composed %s — rendered tree against the plugin (SPEC-147 D2)',
	(rune) => {
		const spec = RUNES[rune];
		const scenarios = ['canonical', 'body-and-sections', 'defaults'] as const;
		const mine = (scenario: string) => render(composed(rune), rune, fixture(rune, scenario));
		const theirs = (scenario: string) => render(storytelling, rune, fixture(rune, scenario));

		it.each(scenarios)(
			'%s: identity — the root element, data-rune, typeof, data-density and the split are the same',
			(scenario) => {
				const plugin = theirs(scenario);
				const out = mine(scenario);
				expect(out.name).toBe('article');
				expect(out.name).toBe(plugin.name);
				for (const attr of ['data-rune', 'typeof', 'data-density', 'data-media-position']) {
					expect(out.attributes[attr], attr).toBe(plugin.attributes[attr]);
				}
				// Enum attributes and attributes a metaField reads are modifiers of the
				// generated config (D2a, WORK-630). The plugin renders them even when
				// empty; the generated config, with no default, does not.
				for (const attr of spec.sameData) {
					expect(out.attributes[attr], attr).toBe(plugin.attributes[attr] || undefined);
				}
				// The split reaches `card`, which is what lays the media out.
				const [card] = all(out, (n) => n.attributes?.['data-rune'] === 'card');
				expect(card.attributes['data-media-position']).toBe(out.attributes['data-media-position']);
			},
		);

		it.each(scenarios)(
			'%s: root classes and data-* attributes the composed rune does not carry',
			(scenario) => {
				const plugin = theirs(scenario);
				const out = mine(scenario);
				// No block, so no rf-* class (D2, D2a).
				expect(String(plugin.attributes.class)).toMatch(new RegExp(`^rf-${rune}( |$)`));
				expect(out.attributes.class).toBeUndefined();
				expect(html(out)).not.toMatch(new RegExp(`rf-${rune}`));
				// The authored attribute is `type`; the plugin renamed it to
				// `${spec.typeKey}` on the way to its metas. A generated config's
				// modifiers are keyed by attribute, so the composed root carries
				// `data-type`, and only when a value is set or defaulted.
				for (const attr of spec.dataOnlyInPlugin) {
					expect(plugin.attributes, attr).toHaveProperty(attr);
					expect(out.attributes, attr).not.toHaveProperty(attr);
				}
				const typeValue = plugin.attributes[spec.dataOnlyInPlugin[0]];
				expect(out.attributes['data-type']).toBe(typeValue || undefined);
				// The plugin config's `defaultElevation: 'flat'` has no counterpart.
				expect(plugin.attributes['data-elevation']).toBe('flat');
				expect(out.attributes).not.toHaveProperty('data-elevation');
				// The plugin publishes its root under `property: 'contentSection'`.
				expect(plugin.attributes['data-field']).toBe('content-section');
				expect(out.attributes['data-field']).toBeUndefined();
			},
		);

		it.each(scenarios)(
			"%s: the metadata block renders as the plugin's does, under card's classes and keyed `type`",
			(scenario) => {
				const [block] = named(mine(scenario), 'metadata');
				const [projected] = named(theirs(scenario), 'metadata');
				if (!projected) {
					// Every field's `condition` is empty: neither renders a block.
					expect(rune).toBe('faction');
					expect(block).toBeUndefined();
					return;
				}
				// The type row's `data-field` is the attribute's name, not the plugin's
				// renamed meta.
				const rekeyed = JSON.parse(
					JSON.stringify(unclassed(projected)).replaceAll(
						`"data-field":"${spec.typeKey}"`,
						'"data-field":"type"',
					),
				);
				expect(unclassed(block)).toEqual(rekeyed);
				expect(block.attributes.class).toBe('rf-card__metadata');
				expect(projected.attributes.class).toBe(`rf-${rune}__metadata`);
			},
		);

		it("the name is card's title heading, not a span in a preamble header", () => {
			const [span] = named(theirs('canonical'), 'name');
			expect(span.name).toBe('span');
			expect(named(theirs('canonical'), 'preamble')[0].name).toBe('header');
			const [title] = named(mine('canonical'), 'title');
			expect(title.name).toBe('h1');
			expect(text(title)).toBe(spec.baselineName);
			expect(named(mine('canonical'), 'preamble')).toEqual([]);
		});

		it('sections are `details`, with no `data-field="section"` (SPEC-147 D6)', () => {
			const plugin = theirs('canonical');
			const out = mine('canonical');
			expect(all(plugin, (n) => n.attributes?.['data-field'] === 'section')).toHaveLength(2);
			expect(all(plugin, (n) => n.attributes?.['data-rune'] === `${rune}-section`)).toHaveLength(2);
			expect(html(out)).not.toMatch(/data-field="section"/);
			expect(html(out)).not.toMatch(new RegExp(`${rune}-section`));
			const details = all(out, (n) => n.attributes?.['data-rune'] === 'details');
			expect(details.map((d) => text(named(d, 'summary')[0]))).toEqual(
				rune === 'realm' ? ['Geography', 'History'] : ['Ranks', 'Oaths'],
			);
			expect(details.map((d) => named(d, 'body')[0].children[0].attributes['data-slot'])).toEqual([
				'sections',
				'sections',
			]);
			// No `sections` wrapper of the rune's own.
			expect(named(plugin, 'sections')).toHaveLength(1);
			expect(named(out, 'sections')).toEqual([]);
		});

		it('content written alongside sections renders, where the plugin discards it (SPEC-147 Finding 6, D6)', () => {
			const plugin = html(theirs('body-and-sections'));
			const out = html(mine('body-and-sections'));
			const listItem = rune === 'realm' ? 'The Northern Hills' : 'The First Ember';
			const note =
				rune === 'realm' ? 'Aldermere falls in the second act.' : 'The Court is unmasked';
			for (const lost of [listItem, note]) {
				expect(plugin).not.toContain(lost);
				expect(out).toContain(lost);
			}
			const body = all(mine('body-and-sections'), (n) => n.attributes?.['data-slot'] === 'body');
			expect(body.map((n) => n.attributes['data-rune'] ?? n.name)).toEqual(['ul', 'hint']);
		});

		it('a list before the first section is dropped by the plugin even with no sections at all', () => {
			// The plugin's preamble is `scene`, `description` (paragraphs) and `items`
			// (tags). A list matches none of them, so it, and everything after it,
			// is dropped whether or not sections follow. Finding 6 names only the
			// sections case. The composed rune's catch-all `body` keeps both.
			const source = fixture(rune, 'body-and-sections').replace(/\n## [\s\S]*?(\{% \/)/, '\n$1');
			expect(source).not.toMatch(/^## /m);
			const plugin = html(render(storytelling, rune, source));
			const out = html(render(composed(rune), rune, source));
			const note =
				rune === 'realm' ? 'Aldermere falls in the second act.' : 'The Court is unmasked';
			expect(plugin).not.toContain(note);
			expect(out).toContain(note);
		});

		it('the scene leaves the root for card\'s media zone, keeping `property="image"`', () => {
			const plugin = theirs('canonical');
			const out = mine('canonical');
			const [scene] = named(plugin, 'scene');
			expect(plugin.children[0]).toBe(scene);
			expect(scene.attributes).toMatchObject({ 'data-section': 'media', 'data-media': 'cover' });
			expect(named(plugin, 'sceneImage')[0].attributes.property).toBe('image');
			expect(named(out, 'scene')).toEqual([]);
			const [media] = named(out, 'media');
			expect(media.attributes['data-section']).toBe('media');
			expect(media.children[0].attributes).toMatchObject({
				'data-slot': 'scene',
				property: 'image',
			});
			// No scene, no media zone (D17's empty-zone guard); the plugin has none either.
			expect(named(mine('defaults'), 'media')).toEqual([]);
			expect(named(theirs('defaults'), 'scene')).toEqual([]);
		});

		it('the description is a slot-named paragraph in card’s body, not a `body` wrapper of its own', () => {
			const [body] = named(theirs('canonical'), 'body').filter(
				(n) => n.attributes.class === `rf-${rune}__body`,
			);
			expect(body.attributes['data-section']).toBe('body');
			const [p] = all(mine('canonical'), (n) => n.attributes?.['data-slot'] === 'description');
			expect(p.name).toBe('p');
			expect(text(p)).toBe(text(body));
		});
	},
);

describe('composed realm and faction — both trees, recorded', () => {
	it.each(RUNE_NAMES)('%s: canonical', (rune) => {
		const plugin = html(render(storytelling, rune, fixture(rune, 'canonical')));
		const out = html(render(composed(rune), rune, fixture(rune, 'canonical')));
		expect({ plugin, composed: out }).toMatchSnapshot();
	});
});

// ---------------------------------------------------------------------------
// Why `card` and not `mediatext` — SPEC-147's mapping, measured
// ---------------------------------------------------------------------------

describe('the split over `{% mediatext %}`, as SPEC-147 states it', () => {
	// The same definition with `card` (and its `---` delimiter) swapped for
	// `mediatext`, which splits image paragraphs from text in its own transform.
	const overMediatext = definitions.realm
		.replace(/^\{% card [^\n]*%\}\n/m, '{% mediatext %}\n')
		.replace('{% slot name="scene" /%}\n\n---\n', '{% slot name="scene" /%}\n')
		.replace('{% /card %}', '{% /mediatext %}');
	const viaMediatext = () => composedWith({ realm: overMediatext });
	const realmOf = (pkg: Plugin, source: string) => render(pkg, 'realm', source);

	it('constructs, and publishes the same graph', () => {
		expect(overMediatext).toContain('{% mediatext %}');
		expect(overMediatext).not.toContain('{% card');
		expect(harvestWith(viaMediatext(), 'realm').jsonLd).toEqual(recorded('realm').jsonLd);
	});

	it('1. cannot carry the split: `mediatext` speaks `align`/`ratio`, not `media-position`', () => {
		// The baseline fixture writes `media-position="start"`. `card` takes the
		// SplitLayoutModel attributes realm and faction declare; `mediatext` does
		// not, and `top`/`bottom`/`cover` and `valign`/`collapse` have no
		// counterpart in its vocabulary at all.
		const out = realmOf(viaMediatext(), fixture('realm', 'canonical'));
		const [mt] = all(out, (n) => n.attributes?.['data-rune'] === 'media-text');
		expect(out.attributes['data-media-position']).toBe('start');
		expect(mt.attributes).not.toHaveProperty('data-media-position');
		expect(mt.attributes['data-align']).toBe('left');
		expect(Object.keys((coreTags as Json).mediatext.attributes ?? {})).not.toContain(
			'media-position',
		);
	});

	it('2. leaves an empty media zone when there is no scene', () => {
		const out = realmOf(viaMediatext(), fixture('realm', 'defaults'));
		const [media] = named(out, 'media');
		expect(media.children).toEqual([]);
		expect(named(realmOf(composed('realm'), fixture('realm', 'defaults')), 'media')).toEqual([]);
	});

	it('3. moves an image the author put in the description into the media zone, dropping its slot name', () => {
		const source = '{% realm name="Aldermere" %}\nA cold kingdom.\n\n![map](map.png)\n{% /realm %}';
		const out = realmOf(viaMediatext(), source);
		const [img] = named(out, 'media')[0].children;
		expect(img.attributes.src).toBe('map.png');
		expect(img.attributes).not.toHaveProperty('data-slot');
		// `card` and the plugin both keep it in the body, where it was written.
		const [mapP] = all(realmOf(composed('realm'), source), (n) =>
			n.children?.some((c: Json) => c?.attributes?.src === 'map.png'),
		);
		expect(mapP.attributes['data-slot']).toBe('description');
		expect(named(realmOf(storytelling, source), 'scene')).toEqual([]);
		expect(html(named(realmOf(storytelling, source), 'body')[0])).toContain('map.png');
	});
});

// ---------------------------------------------------------------------------
// SPEC-145 D7's realm example as it was written — what the stored definition corrects
// ---------------------------------------------------------------------------

describe("SPEC-145 D7's realm example as written", () => {
	const asWritten = `---
tag: article
attributes:
  name:      { type: string, required: true }
  realmType: { type: string }
  scale:     { type: string }
content:
  type: sections
  sectionHeading: heading
  preamble:
    scene: { match: image, optional: true }
metaFields:
  realmType: { metaType: category, label: Type }
  scale:     { metaType: category, label: Scale, condition: scale }
blocks:
  metadata: { fields: [realmType, scale], layout: definition-list }
---

{% mediatext %}
{% slot name="scene" /%}
---
# {% $attrs.name %}

{% metablock name="metadata" /%}

{% slot name="body" /%}

{% slot name="sections" each %}
  {% details summary=$each.heading %}{% slot /%}{% /details %}
{% /slot %}
{% /mediatext %}
`;

	it('does not construct: `body` names no field of its content model (D26)', () => {
		expect(() => defineComposedRune('realm', asWritten)).toThrow(/`body`/);
	});

	it('with `body` declared, still does not construct: `$each.heading` needs `emitAttributes` (D26)', () => {
		const withBody = asWritten.replace(
			'    scene: { match: image, optional: true }\n',
			'    scene: { match: image, optional: true }\n    body:  { match: any, optional: true, greedy: true }\n',
		);
		expect(() => defineComposedRune('realm', withBody)).toThrow(
			"`$each.heading` names no field of slot `sections`. `$each` exposes exactly the content model's `emitAttributes` (none declared)",
		);
	});

	it('names its type attribute `realmType`, which no realm page writes: the authored attribute is `type`', () => {
		expect(Object.keys(merge(storytelling).tags.realm.attributes ?? {})).toContain('type');
		expect(Object.keys(merge(storytelling).tags.realm.attributes ?? {})).not.toContain('realmType');
	});
});
