import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { extractSeo, parse, serializeTree } from '@refrakt-md/runes';
import { renderToHtml } from '@refrakt-md/transform';
import { storytelling } from '../../../plugins/storytelling/src/index.js';
import { marketing } from '../../../plugins/marketing/src/index.js';
import { pageContext, type Json } from './composed-storytelling.js';

/**
 * SPEC-160 D8 / WORK-655 — `{% link %}` around blocks, wrap or stretch decided
 * in the identity transform, and `card` / `bento-cell` `href` rendered as the
 * same focusable, labelled stretched link.
 */

const { schemas, identity } = pageContext(storytelling);
const marketingPage = pageContext(marketing);

function tree(source: string, ctx = { schemas, identity }): Json {
	return Markdoc.transform(parse(source), {
		...ctx.schemas,
		variables: { generatedIds: new Set<string>(), path: '/p', headings: [] },
	} as never);
}

function html(source: string, ctx = { schemas, identity }): string {
	return renderToHtml(ctx.identity(serializeTree(tree(source, ctx)) as never) as never);
}

/** Any `<a>` that has another `<a>` inside it. */
const nestedAnchor = (out: string) => /<a\b[^>]*>(?:(?!<\/a>).)*<a\b/s.test(out);

describe('link around blocks — wrap', () => {
	it('renders a real <a> around content with nothing interactive in it', () => {
		const out = html('{% link href="/guide" %}\n## The guide\n\nRead it first.\n{% /link %}');
		expect(out).toMatch(
			/<a href="\/guide" data-link="wrap"><h2 id="the-guide">The guide<\/h2><p>Read it first\.<\/p><\/a>/,
		);
		expect(out).not.toContain('data-link-href');
	});

	it('carries aria-label when given', () => {
		const out = html('{% link href="/g" aria-label="Open the guide" %}\nText.\n{% /link %}');
		expect(out).toContain('<a href="/g" data-link="wrap" aria-label="Open the guide">');
	});
});

describe('link around blocks — stretch', () => {
	it('appends a stretched anchor when the content holds a link, labelled by its heading', () => {
		const out = html(
			'{% link href="/guide" %}\n## The guide\n\nSee [the index](/index).\n{% /link %}',
		);
		expect(out).toMatch(
			/^<article><div data-link="host"><h2 id="the-guide">The guide<\/h2><p>See <a href="\/index">the index<\/a>\.<\/p><a href="\/guide" data-name="link" data-link="stretch" aria-labelledby="the-guide"><\/a><\/div><\/article>$/,
		);
		expect(nestedAnchor(out)).toBe(false);
	});

	it('puts the anchor inside a single rune’s root, with its BEM class', () => {
		const out = html(
			'{% link href="/post" %}\n{% hint type="note" %}\nSee [the docs](/docs).\n{% /hint %}\n{% /link %}',
		);
		expect(out).toMatch(/^<article><section class="rf-hint /);
		expect(out).toMatch(
			/<a href="\/post" data-name="link" data-link="stretch" class="rf-hint__link" aria-label="[^"]*See the docs[^"]*"><\/a><\/section><\/article>$/,
		);
		expect(nestedAnchor(out)).toBe(false);
	});

	it('sees a link added after the schema transform, as postProcess adds them', () => {
		// Built before any link exists in the content, so a schema-time choice
		// would have wrapped it. The engine runs on the final tree.
		const serialized = serializeTree(
			tree('{% link href="/realm" %}\n## Aldermere\n\nThe seat of Veshra.\n{% /link %}'),
		) as Json;
		const marker = serialized.children[0];
		expect(marker.attributes['data-link-href']).toBe('/realm');
		const p = marker.children[1];
		p.children = [
			'The seat of ',
			{
				$$mdtype: 'Tag',
				name: 'a',
				attributes: { href: '/characters/veshra' },
				children: ['Veshra'],
			},
			'.',
		];
		const out = renderToHtml(identity(serialized) as never);
		expect(out).toContain('data-link="stretch"');
		expect(out).not.toContain('data-link="wrap"');
		expect(nestedAnchor(out)).toBe(false);
	});

	it('treats an interactive rune as interactive', () => {
		const out = html(
			'{% link href="/x" %}\n{% tabs %}\n## One\nA\n## Two\nB\n{% /tabs %}\n{% /link %}',
		);
		expect(out).toContain('data-link="stretch"');
		expect(out).not.toContain('data-link="wrap"');
	});
});

describe('link around blocks — boundaries', () => {
	it('renders the content unchanged for an empty href', () => {
		const out = html('{% link href="" %}\n## Plain\n\nNo link here.\n{% /link %}');
		expect(out).toBe('<article><h2 id="plain">Plain</h2><p>No link here.</p></article>');
	});

	it('is not a name-resolution boundary: a schema property inside it still publishes', () => {
		const source =
			'{% link href="/characters/veshra" %}\n{% character name="Veshra" role="antagonist" %}\nA necromancer.\n{% /character %}\n{% /link %}';
		const { jsonLd } = extractSeo(tree(source) as never, {}, '/p');
		const graph = JSON.stringify(jsonLd);
		expect(graph).toContain('"@type":"Person"');
		expect(graph).toContain('"name":"Veshra"');
	});

	it('emits no data-rune of its own', () => {
		const marker = serializeTree(tree('{% link href="/x" %}\nText.\n{% /link %}')) as Json;
		expect(marker.children[0].attributes).not.toHaveProperty('data-rune');
	});

	it('leaves the inline form a plain <a>', () => {
		const out = html('Read {% link href="/x" %}this{% /link %} now.');
		expect(out).toBe('<article><p>Read <a href="/x">this</a> now.</p></article>');
	});
});

describe('card and bento-cell href render through the stretched link', () => {
	it('card: a focusable anchor labelled by the card title, not aria-hidden', () => {
		const out = html('{% card href="/posts/one" %}\n## First post\n\nA summary.\n{% /card %}');
		expect(out).toMatch(
			/<a data-name="link" href="\/posts\/one" data-link="stretch" class="rf-card__link" aria-labelledby="first-post"><\/a>/,
		);
		expect(out).not.toContain('aria-hidden');
		expect(out).not.toContain('tabindex');
	});

	it('bento-cell: the same, labelled by the cell’s title', () => {
		const out = html(
			'{% bento %}\n{% bento-cell href="/a" %}\n## Alpha\n\nFirst cell.\n{% /bento-cell %}\n{% /bento %}',
			marketingPage,
		);
		expect(out).toMatch(
			/<a data-name="link" href="\/a" data-link="stretch" class="rf-bento-cell__link" aria-labelledby="[^"]+"><\/a>/,
		);
		expect(out).not.toContain('aria-hidden');
	});
});
