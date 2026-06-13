import { describe, it, expect, beforeAll, vi } from 'vitest';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { parse, findTag } from './helpers.js';
import {
	registerImageScheme,
	resolveImageScheme,
	hasImageScheme,
	placeholderSvg,
	PLACEHOLDER_SHAPES,
} from '../src/index.js';

const testIcons = {
	global: {
		rocket: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15v5"/><circle cx="12" cy="10" r="3"/></svg>',
	},
};

// A stub scheme proves the hook without coupling to the core resolvers.
beforeAll(() => {
	registerImageScheme('teststub', (arg, ctx) =>
		new Tag('mark', {
			'data-arg': arg,
			'data-alt': ctx.alt ?? '',
			'data-title': ctx.title ?? '',
			'data-property': ctx.property ?? '',
		}),
	);
});

describe('image-src scheme registry (WORK-418)', () => {
	it('registers and reports schemes', () => {
		expect(hasImageScheme('teststub')).toBe(true);
		expect(hasImageScheme('icon')).toBe(true);
		expect(hasImageScheme('placeholder')).toBe(true);
		expect(hasImageScheme('nope')).toBe(false);
	});

	it("passes the scheme argument + alt/title/property to the resolver", () => {
		const tag = resolveImageScheme('teststub:the-arg', {
			alt: 'Alt text',
			title: 'A title',
			property: 'image',
			config: {} as any,
		});
		expect(tag).not.toBeNull();
		expect(tag!.name).toBe('mark');
		expect(tag!.attributes['data-arg']).toBe('the-arg');
		expect(tag!.attributes['data-alt']).toBe('Alt text');
		expect(tag!.attributes['data-title']).toBe('A title');
		expect(tag!.attributes['data-property']).toBe('image');
	});

	it('returns null for unregistered schemes and bare paths', () => {
		expect(resolveImageScheme('https://example.com/x.png', { config: {} as any })).toBeNull();
		expect(resolveImageScheme('data:image/png;base64,AAAA', { config: {} as any })).toBeNull();
		expect(resolveImageScheme('./local/photo.png', { config: {} as any })).toBeNull();
		expect(resolveImageScheme('/abs/photo.png', { config: {} as any })).toBeNull();
	});

	it('a registered resolver replaces the <img> in the transform', () => {
		const result = parse('![Hi there](teststub:xyz)');
		const mark = findTag(result as any, t => t.name === 'mark');
		expect(mark).toBeDefined();
		expect(mark!.attributes['data-arg']).toBe('xyz');
		expect(mark!.attributes['data-alt']).toBe('Hi there');
		// No <img> leaked.
		expect(findTag(result as any, t => t.name === 'img')).toBeUndefined();
	});

	it('unknown schemes and ordinary paths fall through to <img>', () => {
		const result = parse('![Photo](mystery:thing)');
		const img = findTag(result as any, t => t.name === 'img');
		expect(img).toBeDefined();
	});
});

describe('icon: image-src scheme (WORK-419)', () => {
	it('inlines the theme icon set SVG with alt as the accessible label', () => {
		const result = parse('![GitHub rocket](icon:rocket)', { __icons: testIcons });
		const svg = findTag(result as any, t => t.name === 'svg');
		expect(svg).toBeDefined();
		expect(svg!.attributes['data-icon']).toBe('rocket');
		expect(svg!.attributes.class).toBe('rf-icon');
		expect(svg!.attributes.role).toBe('img');
		expect(svg!.attributes['aria-label']).toBe('GitHub rocket');
		expect(findTag(result as any, t => t.name === 'img')).toBeUndefined();
	});

	it('warns and falls back gracefully for an unknown icon name', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const result = parse('![Mystery](icon:does-not-exist)', { __icons: testIcons });
		const span = findTag(result as any, t => t.name === 'span' && t.attributes['data-icon'] === 'does-not-exist');
		expect(span).toBeDefined();
		expect(span!.attributes.class).toBe('rf-icon');
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});
});

describe('placeholder: image-src scheme (WORK-420)', () => {
	it('emits a token-tinted inline SVG for each documented shape', () => {
		for (const shape of PLACEHOLDER_SHAPES) {
			const result = parse(`![A ${shape}](placeholder:${shape})`);
			const svg = findTag(result as any, t => t.name === 'svg' && t.attributes.class === 'rf-placeholder');
			expect(svg, shape).toBeDefined();
			expect(svg!.attributes['data-shape']).toBe(shape);
			expect(svg!.attributes.role).toBe('img');
			expect(svg!.attributes['aria-label']).toBe(`A ${shape}`);
			// Only theme tokens for colour — no hardcoded hex.
			const serialized = JSON.stringify(svg);
			expect(serialized).toContain('var(--rf-color-');
			expect(serialized).not.toMatch(/#[0-9a-fA-F]{3,6}/);
		}
	});

	it('is deterministic across runs', () => {
		const a = JSON.stringify(placeholderSvg('portrait', { label: 'x' }));
		const b = JSON.stringify(placeholderSvg('portrait', { label: 'x' }));
		expect(a).toBe(b);
	});

	it('falls back to cover for an unknown shape, with a warning', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const result = parse('![Weird](placeholder:hexagon)');
		const svg = findTag(result as any, t => t.name === 'svg' && t.attributes.class === 'rf-placeholder');
		expect(svg).toBeDefined();
		expect(svg!.attributes['data-shape']).toBe('cover');
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	it('marks a placeholder with empty alt as decorative', () => {
		const svg = placeholderSvg('cover', { label: '' });
		expect(svg.attributes['aria-hidden']).toBe('true');
		expect(svg.attributes.role).toBeUndefined();
	});
});
