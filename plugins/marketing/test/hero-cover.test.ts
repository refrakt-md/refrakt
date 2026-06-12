import { describe, it, expect } from 'vitest';
import { createTransform } from '@refrakt-md/transform';
import type { ThemeConfig } from '@refrakt-md/transform';
import type { SerializedTag } from '@refrakt-md/types';
import { parse, findTag } from './helpers.js';
import { config as marketingConfig } from '../src/config.js';

const themeConfig: ThemeConfig = {
	prefix: 'rf', tokenPrefix: '--rf', icons: {},
	runes: marketingConfig,
};

/** Schema output → plain serialized tree → identity transform. */
function identity(content: string): SerializedTag {
	const result = parse(content);
	const hero = findTag(result as any, t => t.attributes['data-rune'] === 'hero');
	expect(hero).toBeDefined();
	const serialized = JSON.parse(JSON.stringify(hero)) as SerializedTag;
	const t = createTransform(themeConfig);
	return t(serialized) as SerializedTag;
}

const findByAttr = (node: any, attr: string, value: string): any => {
	if (!node || typeof node !== 'object') return undefined;
	if (node.attributes?.[attr] === value) return node;
	for (const c of node.children ?? []) {
		const hit = findByAttr(c, attr, value);
		if (hit) return hit;
	}
	return undefined;
};

const coverHero = `{% hero media-position="cover" %}
![backdrop](/img/backdrop.png)

---

# Ship docs that read themselves

From Markdown to pixel-perfect pages.

- [Get Started](/docs)
{% /hero %}`;

describe('SPEC-101 hero cover', () => {
	it('media-position=cover applies the cover variant (modifier class + full scope)', () => {
		const r = identity(coverHero);
		expect(r.attributes.class).toContain('rf-hero--cover');
		expect(r.attributes['data-cover-scope']).toBe('full');
		expect(r.attributes['data-media-position']).toBe('cover');
	});

	it('demotes the cover media zone to a presentational guest', () => {
		const r = identity(coverHero);
		const media = findByAttr(r, 'data-section', 'media');
		expect(media).toBeDefined();
		expect(media.attributes['data-guest-posture']).toBe('presentational');
	});

	it('flips the content overlay (not the root) to a dark scheme', () => {
		const r = identity(coverHero);
		expect(r.attributes['data-color-scheme']).toBeUndefined();
		const overlay = findByAttr(r, 'data-name', 'content');
		expect(overlay).toBeDefined();
		expect(overlay.attributes['data-color-scheme']).toBe('dark');
	});

	it('height knob surfaces as a data attribute', () => {
		const r = identity(coverHero.replace('media-position="cover"', 'media-position="cover" height="lg"'));
		expect(r.attributes['data-height']).toBe('lg');
	});

	it('aspect knob lands as an inline aspect-ratio style', () => {
		const r = identity(coverHero.replace('media-position="cover"', 'media-position="cover" aspect="16/9"'));
		expect(r.attributes.style).toContain('aspect-ratio: 16/9');
	});

	it('content-place emits the 2-axis overlay vars', () => {
		const r = identity(coverHero.replace('media-position="cover"', 'media-position="cover" content-place="end start"'));
		expect(r.attributes['data-content-place']).toBe('end start');
		expect(r.attributes.style).toContain('--cover-place-block: end');
		expect(r.attributes.style).toContain('--cover-place-inline: start');
	});

	it('a non-cover hero stays uncovered (no variant artefacts)', () => {
		const r = identity(coverHero.replace(' media-position="cover"', ''));
		expect(r.attributes.class).not.toContain('rf-hero--cover');
		expect(r.attributes['data-cover-scope']).toBeUndefined();
		expect(r.attributes['data-media-position']).toBe('top');
		const media = findByAttr(r, 'data-section', 'media');
		expect(media?.attributes['data-guest-posture']).toBeUndefined();
	});
});
