import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig, RuneConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

function asTag(node: any): SerializedTag {
	return node as SerializedTag;
}

function baseConfig(runes: ThemeConfig['runes']): ThemeConfig {
	return { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes };
}

const isT = (c: unknown): c is SerializedTag =>
	typeof c === 'object' && c !== null && '$$mdtype' in (c as object);

/** Recursively find the first descendant element with `data-name === name`. */
function findByName(node: SerializedTag, name: string): SerializedTag | undefined {
	for (const child of node.children) {
		if (!isT(child)) continue;
		if (child.attributes['data-name'] === name) return child;
		const found = findByName(child, name);
		if (found) return found;
	}
	return undefined;
}

/** data-name values of a node's direct element children. */
const directNames = (node: SerializedTag): (string | undefined)[] =>
	node.children.filter(isT).map(c => c.attributes['data-name']);

describe('SPEC-080 block-and-layout assembly', () => {
	// api-shaped: a flat rune whose eyebrow bar mixes chip + bare fields.
	const apiConfig: RuneConfig = {
		block: 'api',
		modifiers: {
			method: { source: 'meta', default: 'GET' },
			path: { source: 'meta' },
			auth: { source: 'meta' },
		},
		metaFields: {
			method: { metaType: 'category', sentimentMap: { GET: 'positive', DELETE: 'negative' } },
			path: { metaType: 'code' },
			auth: { metaType: 'status', condition: 'auth' },
		},
		blocks: {
			eyebrow: { fields: ['method', 'path', { field: 'auth', align: 'end' }], layout: 'bar', wrap: false },
		},
		layout: { root: ['eyebrow', 'body'] },
	};

	function makeApiTag(attrs: { method?: string; path?: string; auth?: string }) {
		const metas: SerializedTag[] = [];
		for (const [field, value] of Object.entries(attrs)) {
			if (value !== undefined) metas.push(makeTag('meta', { 'data-field': field, content: value }));
		}
		return makeTag('article', { 'data-rune': 'api' }, [
			...metas,
			makeTag('div', { 'data-name': 'body' }, [makeTag('p', {}, ['Body'])]),
		]);
	}

	describe('bar layout — intrinsic field shape', () => {
		it('renders chip vs bare from metaType, not the layout', () => {
			const transform = createTransform(baseConfig({ Api: apiConfig }));
			const result = asTag(transform(makeApiTag({ method: 'POST', path: '/users/:id', auth: 'Bearer' })));

			const eyebrow = findByName(result, 'eyebrow')!;
			expect(eyebrow.attributes['data-zone-layout']).toBe('bar');
			expect(eyebrow.attributes['data-wrap']).toBe('false');

			const [method, path, auth] = eyebrow.children as SerializedTag[];
			// category → chip
			expect(method.attributes.class).toBe('rf-badge');
			expect(method.attributes['data-meta-type']).toBe('category');
			expect(method.children[0]).toBe('POST');
			// code → bare inline, no chip
			expect(path.attributes.class).toBeUndefined();
			expect(path.attributes['data-meta-type']).toBe('code');
			expect(path.children[0]).toBe('/users/:id');
			// status → chip
			expect(auth.attributes.class).toBe('rf-badge');
			expect(auth.attributes['data-meta-type']).toBe('status');
		});

		it('tags the aligned field with data-align="end"', () => {
			const transform = createTransform(baseConfig({ Api: apiConfig }));
			const result = asTag(transform(makeApiTag({ method: 'GET', path: '/ping', auth: 'Bearer' })));
			const eyebrow = findByName(result, 'eyebrow')!;
			const auth = eyebrow.children[2] as SerializedTag;
			expect(auth.attributes['data-align']).toBe('end');
			// non-aligned fields carry no data-align
			expect((eyebrow.children[0] as SerializedTag).attributes['data-align']).toBeUndefined();
		});

		it('omits conditional fields whose condition is unmet', () => {
			const transform = createTransform(baseConfig({ Api: apiConfig }));
			const result = asTag(transform(makeApiTag({ method: 'GET', path: '/ping' })));
			const eyebrow = findByName(result, 'eyebrow')!;
			// auth absent → only method + path
			expect(eyebrow.children.length).toBe(2);
		});
	});

	describe('placement', () => {
		it('places projected blocks and orders transform blocks (flat root)', () => {
			const transform = createTransform(baseConfig({ Api: apiConfig }));
			const result = asTag(transform(makeApiTag({ method: 'GET', path: '/ping' })));
			// root: eyebrow (projected) then body (transform). metas filtered out.
			expect(directNames(result)).toEqual(['eyebrow', 'body']);
		});

		it('appends unlisted transform children in transform order (never dropped)', () => {
			const cfg: RuneConfig = {
				...apiConfig,
				layout: { root: ['eyebrow'] }, // body not named
			};
			const transform = createTransform(baseConfig({ Api: cfg }));
			const result = asTag(transform(makeApiTag({ method: 'GET', path: '/ping' })));
			// body is unnamed → appended after the named eyebrow
			expect(directNames(result)).toEqual(['eyebrow', 'body']);
		});

		it('skips a named block that resolves to nothing', () => {
			const transform = createTransform(baseConfig({ Api: apiConfig }));
			// no path/method/auth at all → eyebrow renders nothing (all unset;
			// method defaults to GET though, so eyebrow still renders). Use a
			// config whose only field is conditional + unset.
			const cfg: RuneConfig = {
				block: 'api',
				modifiers: { auth: { source: 'meta' } },
				metaFields: { auth: { metaType: 'status', condition: 'auth' } },
				blocks: { eyebrow: { fields: ['auth'], layout: 'bar' } },
				layout: { root: ['eyebrow', 'body'] },
			};
			const result = asTag(createTransform(baseConfig({ Api: cfg }))(
				makeTag('article', { 'data-rune': 'api' }, [makeTag('div', { 'data-name': 'body' }, ['x'])]),
			));
			expect(findByName(result, 'eyebrow')).toBeUndefined();
			expect(directNames(result)).toEqual(['body']);
		});

		it('omitting layout renders the transform tree verbatim (no projection)', () => {
			const cfg: RuneConfig = { ...apiConfig, layout: undefined };
			const transform = createTransform(baseConfig({ Api: cfg }));
			const result = asTag(transform(makeApiTag({ method: 'GET', path: '/ping' })));
			expect(findByName(result, 'eyebrow')).toBeUndefined();
			expect(directNames(result)).toEqual(['body']);
		});

		it('places a block into a named (nested) container, not just root', () => {
			const cfg: RuneConfig = {
				block: 'recipe',
				modifiers: { difficulty: { source: 'meta', default: 'easy' } },
				metaFields: { difficulty: { metaType: 'category', label: 'Difficulty' } },
				blocks: { metadata: { fields: ['difficulty'], layout: 'definition-list' } },
				layout: { content: ['metadata', 'preamble', 'steps'] },
			};
			const content = makeTag('div', { 'data-name': 'content' }, [
				makeTag('header', { 'data-name': 'preamble' }, [makeTag('h2', {}, ['Pancakes'])]),
				makeTag('ol', { 'data-name': 'steps' }, [makeTag('li', {}, ['Mix'])]),
			]);
			const result = asTag(createTransform(baseConfig({ Recipe: cfg }))(
				makeTag('article', { 'data-rune': 'recipe' }, [
					makeTag('meta', { 'data-field': 'difficulty', content: 'hard' }),
					makeTag('div', { 'data-name': 'media' }, [makeTag('img', { src: '/x.jpg' })]),
					content,
				]),
			));
			// root untouched: media + content
			expect(directNames(result)).toEqual(['media', 'content']);
			// content reordered with metadata injected on top
			const contentEl = findByName(result, 'content')!;
			expect(directNames(contentEl)).toEqual(['metadata', 'preamble', 'steps']);
			expect((contentEl.children[0] as SerializedTag).attributes['data-zone-layout']).toBe('definition-list');
		});

		it('can place metadata into the media container (overlay)', () => {
			const cfg: RuneConfig = {
				block: 'recipe',
				modifiers: { difficulty: { source: 'meta', default: 'easy' } },
				metaFields: { difficulty: { metaType: 'category', label: 'Difficulty' } },
				blocks: { metadata: { fields: ['difficulty'], layout: 'bar' } },
				layout: { media: ['scene', 'metadata'], content: ['preamble'] },
			};
			const result = asTag(createTransform(baseConfig({ Recipe: cfg }))(
				makeTag('article', { 'data-rune': 'recipe' }, [
					makeTag('meta', { 'data-field': 'difficulty', content: 'hard' }),
					makeTag('div', { 'data-name': 'media' }, [makeTag('img', { 'data-name': 'scene', src: '/x.jpg' })]),
					makeTag('div', { 'data-name': 'content' }, [makeTag('header', { 'data-name': 'preamble' }, ['T'])]),
				]),
			));
			const media = findByName(result, 'media')!;
			expect(directNames(media)).toEqual(['scene', 'metadata']);
			expect((findByName(media, 'metadata'))!.attributes['data-zone-layout']).toBe('bar');
		});
	});

	describe('link field (href)', () => {
		it('renders a bare <a> with the modifier value as href and label as text', () => {
			const cfg: RuneConfig = {
				block: 'symbol',
				modifiers: { source: { source: 'meta' } },
				metaFields: { source: { label: 'Source', href: 'source', condition: 'source' } },
				blocks: { eyebrow: { fields: [{ field: 'source', align: 'end' }], layout: 'bar' } },
				layout: { root: ['eyebrow', 'body'] },
			};
			const result = asTag(createTransform(baseConfig({ Symbol: cfg }))(
				makeTag('article', { 'data-rune': 'symbol' }, [
					makeTag('meta', { 'data-field': 'source', content: 'https://example.com/src.ts' }),
					makeTag('div', { 'data-name': 'body' }, ['x']),
				]),
			));
			const link = findByName(result, 'eyebrow')!.children[0] as SerializedTag;
			expect(link.name).toBe('a');
			expect(link.attributes.href).toBe('https://example.com/src.ts');
			expect(link.attributes['data-meta-type']).toBe('link');
			expect(link.attributes['data-align']).toBe('end');
			expect(link.attributes.class).toBeUndefined(); // bare, not a chip
			expect(link.children[0]).toBe('Source');
		});
	});

	describe('rating field', () => {
		it('renders `total` marks with the first `value` filled', () => {
			const cfg: RuneConfig = {
				block: 'testimonial',
				modifiers: { rating: { source: 'meta' }, ratingTotal: { source: 'meta', default: '5' } },
				metaFields: { rating: { rating: { total: 'ratingTotal' }, condition: 'rating' } },
				blocks: { rating: { fields: ['rating'], layout: 'bar' } },
				layout: { root: ['rating', 'body'] },
			};
			const result = asTag(createTransform(baseConfig({ Testimonial: cfg }))(
				makeTag('article', { 'data-rune': 'testimonial' }, [
					makeTag('meta', { 'data-field': 'rating', content: '4' }),
					makeTag('meta', { 'data-field': 'rating-total', content: '5' }),
					makeTag('div', { 'data-name': 'body' }, ['x']),
				]),
			));
			const widget = findByName(result, 'rating')!.children[0] as SerializedTag;
			expect(widget.attributes['data-meta-type']).toBe('rating');
			const marks = widget.children as SerializedTag[];
			expect(marks.length).toBe(5);
			expect(marks.filter(m => m.attributes['data-filled'] === 'true').length).toBe(4);
			expect(marks.filter(m => m.attributes['data-filled'] === 'false').length).toBe(1);
		});
	});

	describe('icon field', () => {
		it('renders a leading icon element (value selects the glyph) plus the value text', () => {
			const cfg: RuneConfig = {
				block: 'hint',
				modifiers: { hintType: { source: 'meta', default: 'note' } },
				metaFields: { hintType: { icon: { group: 'hint' } } },
				blocks: { header: { fields: ['hintType'], layout: 'bar' } },
				layout: { root: ['header', 'body'] },
			};
			const result = asTag(createTransform(baseConfig({ Hint: cfg }))(
				makeTag('article', { 'data-rune': 'hint' }, [
					makeTag('meta', { 'data-field': 'hint-type', content: 'warning' }),
					makeTag('div', { 'data-name': 'body' }, ['x']),
				]),
			));
			const field = findByName(result, 'header')!.children[0] as SerializedTag;
			const icon = field.children[0] as SerializedTag;
			expect(icon.attributes['data-icon-group']).toBe('hint');
			expect(icon.attributes['data-icon']).toBe('warning');
			expect(icon.children.length).toBe(0); // glyph drawn in CSS
			const value = field.children[1] as SerializedTag;
			expect(value.attributes['data-meta-value']).toBe('');
			expect(value.children[0]).toBe('warning');
			expect(field.attributes.class).toBeUndefined(); // bare, not a chip
		});
	});

	describe('definition-list block — intrinsic shape', () => {
		it('chip in dd for chip-type, bare dd for value-type', () => {
			const cfg: RuneConfig = {
				block: 'card',
				modifiers: { kind: { source: 'meta' }, since: { source: 'meta' } },
				metaFields: {
					kind: { metaType: 'category', label: 'Kind' },
					since: { metaType: 'temporal', label: 'Since' },
				},
				blocks: { metadata: { fields: ['kind', 'since'], layout: 'definition-list' } },
				layout: { root: ['metadata', 'body'] },
			};
			const result = asTag(createTransform(baseConfig({ Card: cfg }))(
				makeTag('article', { 'data-rune': 'card' }, [
					makeTag('meta', { 'data-field': 'kind', content: 'function' }),
					makeTag('meta', { 'data-field': 'since', content: 'v1.2' }),
					makeTag('div', { 'data-name': 'body' }, ['x']),
				]),
			));
			const metadata = findByName(result, 'metadata')!;
			expect(metadata.name).toBe('dl');
			const [kindRow, sinceRow] = metadata.children as SerializedTag[];
			// kind (category) → chip in dd
			const kindDd = kindRow.children[1] as SerializedTag;
			expect((kindDd.children[0] as SerializedTag).attributes.class).toBe('rf-badge');
			// since (temporal) → bare dd carrying data-meta-type
			const sinceDd = sinceRow.children[1] as SerializedTag;
			expect(sinceDd.attributes['data-meta-type']).toBe('temporal');
			expect(sinceDd.children[0]).toBe('v1.2');
		});
	});
});
