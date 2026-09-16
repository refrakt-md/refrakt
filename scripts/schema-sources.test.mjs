import { describe, it, expect, beforeAll } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { nodes, functions, extractHeadings } from '@refrakt-md/runes';
import { buildContext } from './generate-seo-baseline.mjs';

/**
 * WORK-561 — every schema.org source is addressable by name.
 *
 * SPEC-130's prototype found ~10 sources in *neither* `properties` nor `refs`:
 * reachable by neither route the applier has — not in the field bag, and
 * carrying no `data-name`. They were invisible until the applier tried to
 * resolve them, because a rune can hand a node straight to `schema:` and the
 * output looks perfectly fine.
 *
 * This is the guard that stops a rune declaring a source it does not emit. It
 * asserts resolution, not values: a `properties` name must reach the
 * `data-rune-fields` bag, a `refs` name must appear as a `data-name` in the
 * rendered tree. WORK-565's applier resolves by exactly those two routes.
 */

/**
 * The sources WORK-561 named, by rune, each with the markup that exercises it.
 *
 * Bodies are inline rather than read from `contracts/seo-baseline/fixtures/`
 * because several of these sources only exist when the rune is given a media
 * slot, and the baseline corpus is deliberately minimal — `recipe` there has no
 * image at all. Adding one would move WORK-562's committed artifact for a
 * reason that has nothing to do with emission, which is exactly the noise that
 * baseline exists to avoid.
 */
const SCHEMA_SOURCES = {
	embed: {
		// Value-only SEO carriers — they exist to carry a string and disappear.
		properties: ['title', 'url', 'embedUrl'],
		refs: [],
		body: '{% embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" title="Example video" /%}',
	},
	tier: {
		// `parsedPrice` / `resolvedCurrency` rather than `price` / `currency`:
		// those names are already taken by the rendered `<p>` and the author's
		// raw attribute, and the flat namespace is unique per rune (ADR-008).
		properties: ['parsedPrice', 'resolvedCurrency'],
		refs: [],
		body: [
			'{% pricing %}',
			'# Plans',
			'',
			'{% tier name="Pro" price="$19" %}',
			'- Unlimited projects',
			'{% /tier %}',
			'{% /pricing %}',
		].join('\n'),
	},
	figure: {
		properties: [],
		// The image survives and is rendered, so it is a ref. It had no name at
		// all — the schema reached it as an anonymous positional `imgs[0]`.
		refs: ['image'],
		body: '{% figure caption="A coral reef" %}\n![Coral reef](https://example.test/reef.jpg)\n{% /figure %}',
	},
	recipe: {
		properties: [],
		// `mediaImage`, not `image`: `pageSectionProperties` already contributes
		// an `image` key for the header's image. `media` is the wrapper.
		refs: ['media', 'mediaImage'],
		body: [
			'{% recipe prepTime="PT5M" servings=1 difficulty="easy" %}',
			'![A cocktail](https://example.test/cocktail.png)',
			'',
			'---',
			'',
			'## Tequila Sunrise',
			'',
			'A layered showstopper.',
			'',
			'- 60ml tequila',
			'',
			'1. Fill a tall glass with ice.',
			'{% /recipe %}',
		].join('\n'),
	},
	playlist: {
		properties: [],
		refs: ['media', 'mediaImage'],
		body: [
			'{% playlist type="album" artist="Pink Floyd" %}',
			'![The Dark Side of the Moon](https://example.test/dsotm.png)',
			'',
			'---',
			'',
			'# The Dark Side of the Moon',
			'',
			'- **Speak to Me** (1:13)',
			'{% /playlist %}',
		].join('\n'),
	},
	realm: {
		properties: [],
		refs: ['scene', 'sceneImage'],
		body: [
			'{% realm name="Rivendell" type="sanctuary" %}',
			'![Rivendell](https://example.test/rivendell.png)',
			'',
			'The Last Homely House East of the Sea.',
			'{% /realm %}',
		].join('\n'),
	},
	faction: {
		properties: [],
		refs: ['scene', 'sceneImage'],
		body: [
			'{% faction name="The Silver Order" type="knightly order" %}',
			'![The Silver Order](https://example.test/order.png)',
			'',
			'A prestigious order of knights.',
			'{% /faction %}',
		].join('\n'),
	},
};

/** Schema-transform a fixture the way a real build does. */
function transform(body, ctx) {
	const ast = Markdoc.parse(body);
	return Markdoc.transform(ast, {
		tags: ctx.tags,
		nodes,
		functions,
		variables: {
			generatedIds: new Set(),
			path: '/schema-sources',
			headings: extractHeadings(ast),
			__source: body,
			__icons: { global: {} },
		},
	});
}

/** Every `data-name` in a tree. */
function dataNames(node, out = new Set()) {
	if (Array.isArray(node)) {
		for (const c of node) dataNames(c, out);
		return out;
	}
	if (!node || typeof node !== 'object') return out;
	const name = node.attributes?.['data-name'];
	if (name !== undefined) out.add(name);
	for (const c of node.children ?? []) dataNames(c, out);
	return out;
}

/** The merged `data-rune-fields` bags in a tree, by rune. */
function fieldBags(node, out = {}) {
	if (Array.isArray(node)) {
		for (const c of node) fieldBags(c, out);
		return out;
	}
	if (!node || typeof node !== 'object') return out;
	const rune = node.attributes?.['data-rune'];
	const raw = node.attributes?.['data-rune-fields'];
	if (rune && raw) {
		try {
			out[rune] = { ...(out[rune] ?? {}), ...JSON.parse(raw) };
		} catch {
			// A malformed bag is a real defect, surfaced by the assertions below
			// rather than swallowed here.
			out[rune] = { __malformed: raw };
		}
	}
	for (const c of node.children ?? []) fieldBags(c, out);
	return out;
}

describe('every declared schema source resolves (WORK-561)', () => {
	let ctx;
	let rendered;

	beforeAll(async () => {
		ctx = await buildContext();
		rendered = {};
		for (const [rune, spec] of Object.entries(SCHEMA_SOURCES)) {
			rendered[rune] = transform(spec.body, ctx);
		}
	}, 120_000);

	it('covers every rune WORK-561 touched', () => {
		// A guard on the guard: dropping a rune from the table would quietly
		// narrow the check to the ones that still pass.
		expect(Object.keys(SCHEMA_SOURCES).sort()).toEqual([
			'embed',
			'faction',
			'figure',
			'playlist',
			'realm',
			'recipe',
			'tier',
		]);
	});

	it('names at least ten sources in total', () => {
		// SPEC-130's prototype found "roughly ten"; this is what that resolved to.
		const total = Object.values(SCHEMA_SOURCES).reduce(
			(n, s) => n + s.properties.length + s.refs.length,
			0,
		);
		expect(total).toBeGreaterThanOrEqual(10);
	});

	for (const [rune, spec] of Object.entries(SCHEMA_SOURCES)) {
		if (spec.properties.length > 0) {
			it(`${rune}: every property source reaches the field bag`, () => {
				const bag = fieldBags(rendered[rune])[rune] ?? {};
				for (const name of spec.properties) {
					expect(
						Object.hasOwn(bag, name),
						`${rune} declares "${name}" but it is not in data-rune-fields (have: ${Object.keys(bag).join(', ') || 'none'})`,
					).toBe(true);
				}
			});
		}

		if (spec.refs.length > 0) {
			it(`${rune}: every ref source carries a data-name`, () => {
				const names = dataNames(rendered[rune]);
				for (const name of spec.refs) {
					expect(
						names.has(name),
						`${rune} declares ref "${name}" but no node carries that data-name (have: ${[...names].join(', ') || 'none'})`,
					).toBe(true);
				}
			});
		}
	}

	it('keeps the SEO carriers in the output rather than dropping them', () => {
		// The trap this item's approach warns about: a meta added to `properties`
		// but *not* named in `schema:` is classified a pure-data meta, given
		// `data-field`, and dropped from the children — silently deleting a schema
		// carrier. Every meta here is in both maps, so `isSeoMeta` holds and it
		// survives carrying `property=`.
		for (const rune of ['embed', 'tier']) {
			const serialized = JSON.stringify(rendered[rune]);
			expect(serialized, `${rune} lost its SEO carriers`).toContain('property');
		}
	});

	it('gives an image a name distinct from its wrapper', () => {
		// `.rf-recipe__media` and `.rf-recipe__media-image` must both exist, or the
		// container and the image are not separately addressable.
		const names = dataNames(rendered.recipe);
		expect(names.has('media')).toBe(true);
		expect(names.has('mediaImage')).toBe(true);
	});
});
