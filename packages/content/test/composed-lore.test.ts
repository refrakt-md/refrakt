import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tags as coreTags, parseFixture } from '@refrakt-md/runes';
import type { Plugin } from '@refrakt-md/types';
import { storytelling } from '../../../plugins/storytelling/src/index.js';
// The SEO baseline's own harvest, so the composed rune is measured exactly the
// way `contracts/seo-baseline/baseline.json` was.
import { harvest } from '../../../scripts/generate-seo-baseline.mjs';
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
 * WORK-635 — `lore` as a composed rune, beside the storytelling plugin's `lore`
 * and never in place of it (SPEC-147 D1).
 *
 * The definition, `fixtures/composed-storytelling/runes/lore.md`, places no
 * primitive: a title heading, its declared `metadata` block
 * (`{% metablock %}`, WORK-630) and the body slot. So its prose stays in the
 * composed rune's own nodes, and the cross-link inside the lore page survives
 * where `character`'s were lost (WORK-625, SPEC-147 Finding 4).
 *
 * The gate is SPEC-147 D2's: every difference from the plugin is explained.
 * Each is asserted below and recorded with its reason in WORK-635's resolution.
 */

const LORE = definitionOf('lore');
const composedStorytelling = (): Plugin => composedWith({ lore: LORE });
const fixture = (scenario: string) => fixtureOf('lore', scenario);

const ROOT = join(__dirname, '..', '..', '..');
const baselineFixture = readFileSync(
	join(ROOT, 'contracts', 'seo-baseline', 'fixtures', 'lore.md'),
	'utf-8',
);
const baseline = JSON.parse(
	readFileSync(join(ROOT, 'contracts', 'seo-baseline', 'baseline.json'), 'utf-8'),
) as { fixtures: Array<{ fixture: string; jsonLd: Json; rendered: Json }> };
const recorded = baseline.fixtures.find((f) => f.fixture === 'lore')!;

/** The baseline generator's harvest of a fixture, with `pkg` in the site. */
function harvestWith(pkg: Plugin, raw: string, file = 'lore.md') {
	const { identity } = pageContext(pkg);
	const ctx = { tags: { ...coreTags, ...merge(pkg).tags }, identity };
	return harvest({ file, ...parseFixture(raw, file) }, ctx) as {
		jsonLd: Json;
		rendered: { jsonLd: Json; annotations: Json };
	};
}

/** The `lore` a page renders. */
function render(pkg: Plugin, source: string): Json {
	return find(renderPage(pkg, source), (n) => n.attributes?.['data-rune'] === 'lore');
}

const named = (tree: Json, name: string) => all(tree, (n) => n.attributes?.['data-name'] === name);

/** A one-page site holding `source`, captured with `pkg`. */
async function captureOne(pkg: Plugin, source: string) {
	const dir = mkdtempSync(join(tmpdir(), 'composed-lore-'));
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
// The definition
// ---------------------------------------------------------------------------

describe('composed lore — the definition', () => {
	it('declares the Article row and the entity registration, and places the metadata block and the body', () => {
		expect(LORE).toMatch(
			/schema:\n {2}type: Article\n {2}properties: \{ title: headline, category: articleSection \}/,
		);
		expect(LORE).toMatch(
			/registers:\n {2}entity:\n {4}idFrom: title\n {4}data: \[category, spoiler, tags, \{ name: title \}\]/,
		);
		expect(LORE).toContain('{% metablock name="metadata" /%}');
		expect(LORE).toContain('{% slot name="body" /%}');
	});

	it('accepts the same attributes as the plugin, less `prominence`: it declares no title section', () => {
		const attributes = (pkg: Plugin) => Object.keys(merge(pkg).tags.lore.attributes ?? {}).sort();
		// `prominence` is offered only to a rune with a header-ish section role
		// (SPEC-125 Phase 3). The plugin declares `sections: { title, body }`; a
		// composition declares no sections, so its universal set has no header.
		// `reading` and `dropcap` stay, through `provides: [prose]`.
		expect(attributes(composedStorytelling())).toEqual(
			attributes(storytelling).filter((a) => a !== 'prominence'),
		);
		expect(attributes(composedStorytelling())).toContain('reading');
		expect(attributes(composedStorytelling())).toContain('dropcap');
	});
});

// ---------------------------------------------------------------------------
// JSON-LD — against the `lore` fixture in the SEO baseline
// ---------------------------------------------------------------------------

describe('composed lore — JSON-LD against the SEO baseline (SPEC-147 D2)', () => {
	it('publishes the recorded graph exactly, at both harvest points', () => {
		const composed = harvestWith(composedStorytelling(), baselineFixture);
		expect(composed.jsonLd).toEqual(recorded.jsonLd);
		expect(composed.rendered.jsonLd).toEqual(recorded.rendered.jsonLd);
		expect(composed.jsonLd).toEqual([
			{
				'@context': 'https://schema.org',
				'@type': 'Article',
				articleSection: 'prophecy',
				headline: 'The Prophecy of the Chosen One',
			},
		]);
	});

	it('carries `headline` on a <meta> rather than on the title <span> — the one RDFa difference', () => {
		const composed = harvestWith(composedStorytelling(), baselineFixture);
		expect(recorded.rendered.annotations).toEqual([
			{
				element: 'article',
				typeof: 'Article',
				children: [
					{ element: 'span', property: 'headline', text: 'The Prophecy of the Chosen One' },
					{ element: 'meta', property: 'articleSection', content: 'prophecy' },
				],
			},
		]);
		// `title` is an attribute and the heading is template text, so the value
		// rides the field bag and is published as a <meta>, like `articleSection`.
		expect(composed.rendered.annotations).toEqual([
			{
				element: 'article',
				typeof: 'Article',
				children: [
					{ element: 'meta', property: 'headline', content: 'The Prophecy of the Chosen One' },
					{ element: 'meta', property: 'articleSection', content: 'prophecy' },
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
// The registry — against the storytelling registry snapshot
// ---------------------------------------------------------------------------

describe('composed lore — registration (SPEC-144, against the storytelling snapshot)', () => {
	it('reproduces the committed snapshot exactly: registrations, name index, types, links, warnings', async () => {
		const { snapshot } = await capture(composedStorytelling());
		const committed = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
		for (const key of ['types', 'registrations', 'entityByName', 'links', 'warnings']) {
			// As text, so key order inside every data bag counts too.
			expect(JSON.stringify(snapshot[key]), key).toBe(JSON.stringify(committed[key]));
		}
	});

	it("keeps the cross-link inside the lore page: its prose is the composed rune's own, not a placed primitive's", async () => {
		const { snapshot } = await capture(composedStorytelling());
		expect(snapshot.links['/lore/prophecy']).toEqual(['Witch -> /characters/aria']);
	});

	it('registers the same entity, id and data as the plugin', async () => {
		const composed = await capture(composedStorytelling());
		const plugin = await capture(storytelling);
		const lore = (s: { registrations: Array<{ type: string }> }) =>
			s.registrations.filter((r) => r.type === 'lore');
		expect(lore(composed.snapshot)).toEqual(lore(plugin.snapshot));
		expect(lore(composed.snapshot)).toEqual([
			{
				type: 'lore',
				id: 'The Prophecy of the Chosen One',
				sourceUrl: '/lore/prophecy',
				data: {
					category: 'prophecy',
					spoiler: 'true',
					tags: 'ancient',
					name: 'The Prophecy of the Chosen One',
				},
			},
		]);
	});

	it('registers the same data when every optional attribute is unset — `spoiler` defaults to "false"', async () => {
		const composed = await captureOne(composedStorytelling(), fixture('defaults'));
		const plugin = await captureOne(storytelling, fixture('defaults'));
		expect(composed.snapshot.registrations).toEqual(plugin.snapshot.registrations);
		expect(JSON.stringify(composed.snapshot.registrations[0].data)).toBe(
			JSON.stringify({ category: '', spoiler: 'false', tags: '', name: 'The Sundering' }),
		);
	});
});

// ---------------------------------------------------------------------------
// The rendered tree against the plugin's, every difference explained
// ---------------------------------------------------------------------------

describe('composed lore — rendered tree against the plugin (SPEC-147 D2)', () => {
	const scenarios = ['canonical', 'defaults'] as const;

	it('records both trees for the canonical fixture', () => {
		const plugin = html(render(storytelling, fixture('canonical')));
		const composed = html(render(composedStorytelling(), fixture('canonical')));
		expect({ plugin, composed }).toMatchInlineSnapshot(`
			{
			  "composed": "<article typeof="Article" data-category="prophecy" data-rune="lore" data-density="full"><h1 id="the-prophecy-of-the-chosen-one">The Prophecy of the Chosen One</h1><div data-name="metadata" data-zone="metadata" data-zone-layout="bar"><span class="rf-badge" data-meta-type="category">prophecy</span></div><p data-slot="body">An ancient text found in the ruins of the First Temple.</p><blockquote data-slot="body"><p><em marker="*">When darkness covers the land and the last star fades, one shall rise from forgotten blood to forge the world anew.</em></p></blockquote><meta property="headline" content="The Prophecy of the Chosen One"><meta property="articleSection" content="prophecy"></article>",
			  "plugin": "<article data-field="content-section" class="rf-lore rf-lore--prophecy rf-lore--true rf-lore--ancient" typeof="Article" data-category="prophecy" data-spoiler="true" data-tags="ancient" data-elevation="flat" data-rune="lore" data-density="full"><span data-name="title" property="headline" class="rf-lore__title" data-section="title">The Prophecy of the Chosen One</span><div data-name="metadata" data-zone="metadata" data-zone-layout="bar" class="rf-lore__metadata"><span class="rf-badge" data-meta-type="category">prophecy</span></div><div data-name="body" class="rf-lore__body" data-section="body" data-reading="prose"><p>An ancient text found in the ruins of the First Temple.</p><blockquote><p><em marker="*">When darkness covers the land and the last star fades, one shall rise from forgotten blood to forge the world anew.</em></p></blockquote></div><meta property="articleSection" content="prophecy"></article>",
			}
		`);
	});

	it.each(scenarios)(
		'%s: identity — the root element, data-rune, typeof and data-density are the same',
		(scenario) => {
			const plugin = render(storytelling, fixture(scenario));
			const composed = render(composedStorytelling(), fixture(scenario));
			expect(composed.name).toBe('article');
			expect(composed.name).toBe(plugin.name);
			for (const attr of ['data-rune', 'typeof', 'data-density']) {
				expect(composed.attributes[attr]).toBe(plugin.attributes[attr]);
			}
		},
	);

	it.each(scenarios)(
		'%s: root classes and data-* attributes the composed rune does not carry',
		(scenario) => {
			const plugin = render(storytelling, fixture(scenario));
			const composed = render(composedStorytelling(), fixture(scenario));
			// No block, so no rf-* class (D2, D2a).
			expect(String(plugin.attributes.class)).toMatch(/^rf-lore /);
			expect(composed.attributes.class).toBeUndefined();
			expect(html(composed)).not.toMatch(/rf-lore/);
			// `category` is read by a metaField, so it is a modifier of the generated
			// config (WORK-630) and lands as `data-category`, as on the plugin. The
			// plugin renders it even when empty; the generated config, with no
			// default, does not.
			expect(composed.attributes['data-category']).toBe(
				plugin.attributes['data-category'] || undefined,
			);
			// `spoiler` is a boolean and `tags` free text; neither is an enum nor
			// read by a metaField, so neither becomes a modifier (D2a).
			expect(plugin.attributes).toHaveProperty('data-spoiler');
			expect(plugin.attributes).toHaveProperty('data-tags');
			expect(composed.attributes).not.toHaveProperty('data-spoiler');
			expect(composed.attributes).not.toHaveProperty('data-tags');
			// The plugin config's `defaultElevation: 'flat'` has no counterpart.
			expect(plugin.attributes['data-elevation']).toBe('flat');
			expect(composed.attributes).not.toHaveProperty('data-elevation');
			// The plugin publishes its root under `property: 'contentSection'`.
			expect(plugin.attributes['data-field']).toBe('content-section');
			expect(composed.attributes['data-field']).toBeUndefined();
		},
	);

	it("the spoiler flag reaches no markup: the plugin's `rf-lore--true` was never what Lumina selects", () => {
		const plugin = render(storytelling, fixture('canonical'));
		// Lumina's `lore.css` selects `.rf-lore--spoiler`; the modifier class the
		// engine emits is the value's, `rf-lore--true`. The rule is dead today, so
		// the only spoiler hook a theme could use is the plugin's `data-spoiler`.
		expect(String(plugin.attributes.class)).toContain('rf-lore--true');
		expect(String(plugin.attributes.class)).not.toContain('rf-lore--spoiler');
		expect(plugin.attributes['data-spoiler']).toBe('true');
		expect(html(render(composedStorytelling(), fixture('canonical')))).not.toMatch(/spoiler/);
	});

	it('the title is the template\'s <h1>, not a <span data-name="title">', () => {
		const plugin = render(storytelling, fixture('canonical'));
		const composed = render(composedStorytelling(), fixture('canonical'));
		const [span] = named(plugin, 'title');
		expect(span.name).toBe('span');
		expect(span.attributes['data-section']).toBe('title');
		expect(named(composed, 'title')).toEqual([]);
		const h1 = composed.children[0];
		expect(h1.name).toBe('h1');
		expect(h1.attributes.id).toBe('the-prophecy-of-the-chosen-one');
		expect(text(h1)).toBe('The Prophecy of the Chosen One');
	});

	it("the heading joins the page heading index, where the plugin's <span> did not", async () => {
		const headings = async (pkg: Plugin) => {
			const { site } = await capture(pkg);
			return site.pages.find((p) => p.route.url === '/lore/prophecy')!.headings;
		};
		expect(await headings(storytelling)).toEqual([]);
		expect(await headings(composedStorytelling())).toEqual([
			{ level: 1, text: 'The Prophecy of the Chosen One', id: 'the-prophecy-of-the-chosen-one' },
		]);
	});

	it("the metadata bar renders as the plugin's does, with no BEM class: no primitive names it", () => {
		const [mine] = named(render(composedStorytelling(), fixture('canonical')), 'metadata');
		const [theirs] = named(render(storytelling, fixture('canonical')), 'metadata');
		const { class: cls, ...rest } = theirs.attributes;
		expect(cls).toBe('rf-lore__metadata');
		expect(mine.attributes).toEqual(rest);
		expect(mine.children).toEqual(theirs.children);
		expect(mine.attributes['data-zone-layout']).toBe('bar');
	});

	it('with no category, neither renders a metadata block (its `condition`)', () => {
		expect(named(render(storytelling, fixture('defaults')), 'metadata')).toEqual([]);
		expect(named(render(composedStorytelling(), fixture('defaults')), 'metadata')).toEqual([]);
	});

	it('the body is slot-named nodes on the root, not a `body` wrapper with `data-reading="prose"`', () => {
		const plugin = render(storytelling, fixture('canonical'));
		const composed = render(composedStorytelling(), fixture('canonical'));
		const [body] = named(plugin, 'body');
		expect(body.attributes).toMatchObject({ 'data-section': 'body', 'data-reading': 'prose' });
		expect(named(composed, 'body')).toEqual([]);
		const slotted = composed.children.filter((n: Json) => n?.attributes?.['data-slot'] === 'body');
		expect(slotted.map((n: Json) => n.name)).toEqual(['p', 'blockquote']);
		expect(html(composed)).not.toMatch(/data-reading/);
		// The same content either way.
		expect(slotted.map(text)).toEqual(body.children.map(text));
	});
});
