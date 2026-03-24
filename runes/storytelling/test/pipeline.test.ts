import { describe, it, expect, beforeEach } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';
import { storytellingPipelineHooks } from '../src/pipeline.js';
import type { TransformedPage, EntityRegistry, EntityRegistration, PipelineContext } from '@refrakt-md/types';

function makePage(url: string, content: string): TransformedPage {
	const renderable = parse(content);
	return {
		url,
		title: '',
		headings: [],
		frontmatter: {},
		renderable,
	} as TransformedPage;
}

function makeRegistry() {
	const entries: EntityRegistration[] = [];
	const registry: EntityRegistry = {
		register(entry: EntityRegistration) { entries.push(entry); },
		getAll(type: string) { return entries.filter(e => e.type === type); },
		getById(type: string, id: string) { return entries.find(e => e.type === type && e.id === id); },
		getByUrl(type: string, url: string) { return entries.filter(e => e.type === type && e.sourceUrl === url); },
		getTypes() { return [...new Set(entries.map(e => e.type))]; },
	};
	return { entries, registry };
}

function makeCtx() {
	const warnings: string[] = [];
	return {
		ctx: {
			info: () => {},
			warn: (msg: string) => { warnings.push(msg); },
			error: () => {},
		} as PipelineContext,
		warnings,
	};
}

function runPipeline(pages: TransformedPage[]) {
	const { registry } = makeRegistry();
	const { ctx } = makeCtx();
	storytellingPipelineHooks.register!(pages, registry, ctx);
	const aggregated = { storytelling: storytellingPipelineHooks.aggregate!(registry, ctx) };
	return pages.map(page => storytellingPipelineHooks.postProcess!(page, aggregated, ctx));
}

describe('storytellingPipelineHooks.register', () => {
	let entries: EntityRegistration[];
	let registry: EntityRegistry;
	let ctx: PipelineContext;

	beforeEach(() => {
		({ entries, registry } = makeRegistry());
		({ ctx } = makeCtx());
	});

	it('registers a character entity', () => {
		const page = makePage('/world/veshra', `{% character name="Veshra" role="antagonist" status="alive" aliases="The Bone Witch" tags="magic-user" %}
## Backstory

Raised in the shadow of the Ashen Spire.
{% /character %}`);

		storytellingPipelineHooks.register!([page], registry, ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].type).toBe('character');
		expect(entries[0].id).toBe('Veshra');
		expect(entries[0].sourceUrl).toBe('/world/veshra');
		expect(entries[0].data.name).toBe('Veshra');
		expect(entries[0].data.role).toBe('antagonist');
		expect(entries[0].data.status).toBe('alive');
		expect(entries[0].data.aliases).toBe('The Bone Witch');
		expect(entries[0].data.tags).toBe('magic-user');
	});

	it('registers a realm entity', () => {
		const page = makePage('/world/rivendell', `{% realm name="Rivendell" type="sanctuary" scale="settlement" %}
A hidden valley.
{% /realm %}`);

		storytellingPipelineHooks.register!([page], registry, ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].type).toBe('realm');
		expect(entries[0].id).toBe('Rivendell');
		expect(entries[0].data.realmType).toBe('sanctuary');
		expect(entries[0].data.scale).toBe('settlement');
	});

	it('registers a faction entity', () => {
		const page = makePage('/world/silver-order', `{% faction name="The Silver Order" type="knightly order" alignment="lawful" size="large" %}
A prestigious order of knights.
{% /faction %}`);

		storytellingPipelineHooks.register!([page], registry, ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].type).toBe('faction');
		expect(entries[0].id).toBe('The Silver Order');
		expect(entries[0].data.factionType).toBe('knightly order');
		expect(entries[0].data.alignment).toBe('lawful');
		expect(entries[0].data.size).toBe('large');
	});

	it('registers a lore entity', () => {
		const page = makePage('/world/prophecy', `{% lore title="The Prophecy of the Chosen One" category="prophecy" spoiler=true %}
An ancient text found in the ruins.
{% /lore %}`);

		storytellingPipelineHooks.register!([page], registry, ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].type).toBe('lore');
		expect(entries[0].id).toBe('The Prophecy of the Chosen One');
		expect(entries[0].data.category).toBe('prophecy');
		expect(entries[0].data.spoiler).toBe('true');
	});

	it('registers a plot entity', () => {
		const page = makePage('/world/quest', `{% plot title="The Quest for the Crown" type="quest" structure="linear" %}
The heroes must recover the lost crown.

- [x] **Discovery** — Find the map
- [ ] **Departure** — Leave the city
{% /plot %}`);

		storytellingPipelineHooks.register!([page], registry, ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].type).toBe('plot');
		expect(entries[0].id).toBe('The Quest for the Crown');
		expect(entries[0].data.plotType).toBe('quest');
		expect(entries[0].data.structure).toBe('linear');
	});

	it('registers a bond entity', () => {
		const page = makePage('/world/bonds', `{% bond from="Aragorn" to="Legolas" type="fellowship" status="active" %}
Forged during the Council of Elrond.
{% /bond %}`);

		storytellingPipelineHooks.register!([page], registry, ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].type).toBe('bond');
		expect(entries[0].id).toBe('Aragorn→Legolas');
		expect(entries[0].data.from).toBe('Aragorn');
		expect(entries[0].data.to).toBe('Legolas');
		expect(entries[0].data.bondType).toBe('fellowship');
		expect(entries[0].data.status).toBe('active');
	});

	it('registers multiple entities across pages', () => {
		const pages = [
			makePage('/world/aragorn', `{% character name="Aragorn" role="protagonist" %}
The heir of Isildur.
{% /character %}`),
			makePage('/world/rivendell', `{% realm name="Rivendell" type="sanctuary" %}
A hidden valley.
{% /realm %}`),
		];

		storytellingPipelineHooks.register!(pages, registry, ctx);

		expect(entries).toHaveLength(2);
		expect(entries[0].type).toBe('character');
		expect(entries[1].type).toBe('realm');
	});

	it('skips pages with no storytelling runes', () => {
		const page = makePage('/docs/intro', `# Introduction

Just a normal page.`);

		storytellingPipelineHooks.register!([page], registry, ctx);
		expect(entries).toHaveLength(0);
	});
});

describe('storytellingPipelineHooks.aggregate', () => {
	it('builds relationship graph from bonds', () => {
		const { registry } = makeRegistry();
		const { ctx } = makeCtx();

		const pages = [
			makePage('/world/aragorn', `{% character name="Aragorn" role="protagonist" %}
Content.
{% /character %}`),
			makePage('/world/legolas', `{% character name="Legolas" role="supporting" %}
Content.
{% /character %}`),
			makePage('/world/bonds', `{% bond from="Aragorn" to="Legolas" type="fellowship" status="active" %}
Their bond.
{% /bond %}`),
		];

		storytellingPipelineHooks.register!(pages, registry, ctx);
		const result = storytellingPipelineHooks.aggregate!(registry, ctx) as any;

		// Bidirectional by default
		expect(result.relationships.get('Aragorn')).toBeDefined();
		expect(result.relationships.get('Aragorn')[0].target).toBe('Legolas');
		expect(result.relationships.get('Legolas')).toBeDefined();
		expect(result.relationships.get('Legolas')[0].target).toBe('Aragorn');
	});

	it('warns on orphaned bonds (from entity not registered)', () => {
		const { registry } = makeRegistry();
		const { ctx, warnings } = makeCtx();

		const pages = [
			makePage('/world/legolas', `{% character name="Legolas" role="supporting" %}
Content.
{% /character %}`),
			makePage('/world/bonds', `{% bond from="UnknownCharacter" to="Legolas" type="rivalry" %}
Description.
{% /bond %}`),
		];

		storytellingPipelineHooks.register!(pages, registry, ctx);
		storytellingPipelineHooks.aggregate!(registry, ctx);

		expect(warnings.some(w => w.includes('UnknownCharacter'))).toBe(true);
	});

	it('warns on orphaned bonds (to entity not registered)', () => {
		const { registry } = makeRegistry();
		const { ctx, warnings } = makeCtx();

		const pages = [
			makePage('/world/aragorn', `{% character name="Aragorn" role="protagonist" %}
Content.
{% /character %}`),
			makePage('/world/bonds', `{% bond from="Aragorn" to="GhostCharacter" type="mystery" %}
Description.
{% /bond %}`),
		];

		storytellingPipelineHooks.register!(pages, registry, ctx);
		storytellingPipelineHooks.aggregate!(registry, ctx);

		expect(warnings.some(w => w.includes('GhostCharacter'))).toBe(true);
	});

	it('registers character aliases for cross-link lookup', () => {
		const { registry } = makeRegistry();
		const { ctx } = makeCtx();

		const pages = [
			makePage('/world/aragorn', `{% character name="Aragorn" aliases="Strider, Elessar" %}
Content.
{% /character %}`),
		];

		storytellingPipelineHooks.register!(pages, registry, ctx);
		const result = storytellingPipelineHooks.aggregate!(registry, ctx) as any;

		expect(result.entityByName.get('Aragorn')).toBeDefined();
		expect(result.entityByName.get('Strider')).toBeDefined();
		expect(result.entityByName.get('Elessar')).toBeDefined();
		// Aliases point to same entity
		expect(result.entityByName.get('Strider')!.id).toBe('Aragorn');
	});
});

describe('storytellingPipelineHooks.postProcess — cross-links', () => {
	it('resolves bold text to cross-page links', () => {
		const pages = [
			makePage('/world/aragorn', `{% character name="Aragorn" role="protagonist" %}
A ranger from the North.
{% /character %}`),
			makePage('/world/tale', `{% lore title="The Fellowship" category="history" %}
He fought alongside **Aragorn** in the war.
{% /lore %}`),
		];

		const processed = runPipeline(pages);

		// Tale page should have a link to Aragorn
		const talePage = processed[1];
		const link = findTag(talePage.renderable as any, t => t.name === 'a' && t.attributes.href === '/world/aragorn');
		expect(link).toBeDefined();
		// The link should wrap the strong tag
		const strong = findTag(link!, t => t.name === 'strong');
		expect(strong).toBeDefined();
	});

	it('does not create self-links on entity own page', () => {
		const pages = [
			makePage('/world/aragorn', `{% character name="Aragorn" role="protagonist" %}
**Aragorn** is a hero. He is known as **Aragorn** the brave.
{% /character %}`),
		];

		const processed = runPipeline(pages);

		const aragornPage = processed[0];
		const link = findTag(aragornPage.renderable as any, t => t.name === 'a' && t.attributes.href === '/world/aragorn');
		expect(link).toBeUndefined();
	});

	it('resolves first occurrence only per page', () => {
		const pages = [
			makePage('/world/aragorn', `{% character name="Aragorn" role="protagonist" %}
Content.
{% /character %}`),
			makePage('/world/story', `{% lore title="Tale" category="history" %}
**Aragorn** led the charge. Later, **Aragorn** returned home.
{% /lore %}`),
		];

		const processed = runPipeline(pages);

		const storyPage = processed[1];
		const links = findAllTags(storyPage.renderable as any, t => t.name === 'a' && t.attributes.href === '/world/aragorn');
		expect(links).toHaveLength(1);
	});

	it('does not resolve inside headings', () => {
		const pages = [
			makePage('/world/aragorn', `{% character name="Aragorn" role="protagonist" %}
Content.
{% /character %}`),
			makePage('/world/about', `{% lore title="History" category="history" %}
## **Aragorn** the King

Some text about the king.
{% /lore %}`),
		];

		const processed = runPipeline(pages);

		const aboutPage = processed[1];
		// There should be no link inside the heading
		const headings = findAllTags(aboutPage.renderable as any, t => /^h[1-6]$/.test(t.name));
		for (const heading of headings) {
			const link = findTag(heading, t => t.name === 'a');
			expect(link).toBeUndefined();
		}
	});

	it('does not resolve inside code blocks', () => {
		const pages = [
			makePage('/world/aragorn', `{% character name="Aragorn" role="protagonist" %}
Content.
{% /character %}`),
			makePage('/world/docs', `{% lore title="Code Example" category="technical" %}
Some text then:

\`\`\`
**Aragorn** is not a link here
\`\`\`
{% /lore %}`),
		];

		const processed = runPipeline(pages);

		const docsPage = processed[1];
		const codeBlocks = findAllTags(docsPage.renderable as any, t => t.name === 'pre');
		for (const code of codeBlocks) {
			const link = findTag(code, t => t.name === 'a');
			expect(link).toBeUndefined();
		}
	});

	it('resolves character aliases', () => {
		const pages = [
			makePage('/world/aragorn', `{% character name="Aragorn" aliases="Strider, Elessar" %}
Content.
{% /character %}`),
			makePage('/world/tale', `{% lore title="A Tale" category="history" %}
The ranger known as **Strider** approached.
{% /lore %}`),
		];

		const processed = runPipeline(pages);

		const talePage = processed[1];
		const link = findTag(talePage.renderable as any, t => t.name === 'a' && t.attributes.href === '/world/aragorn');
		expect(link).toBeDefined();
	});

	it('returns unmodified page when no matches', () => {
		const pages = [
			makePage('/world/aragorn', `{% character name="Aragorn" role="protagonist" %}
Content.
{% /character %}`),
			makePage('/world/story', `{% lore title="A Tale" category="history" %}
No bold entity names here.
{% /lore %}`),
		];

		const processed = runPipeline(pages);

		// The story page should be returned as-is
		expect(processed[1].renderable).toBe(pages[1].renderable);
	});
});
