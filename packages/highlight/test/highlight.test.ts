import { describe, it, expect } from 'vitest';
import { createHighlightTransform } from '../src/index.js';
import type { HighlightTransform } from '../src/index.js';
import type { SerializedTag } from '@refrakt-md/types';

function tag(name: string, attributes: Record<string, any>, children: any[] = []): SerializedTag {
	return { $$mdtype: 'Tag' as const, name, attributes, children };
}

describe('highlight transform', () => {
	it('should highlight a code element with data-language', async () => {
		const hl = await createHighlightTransform({ langs: ['javascript'] });
		const tree = tag('code', { 'data-language': 'javascript' }, ['const x = 1;']);

		const result = hl(tree) as SerializedTag;
		expect(result.attributes['data-codeblock']).toBe(true);
		expect(result.children.length).toBe(1);
		expect(typeof result.children[0]).toBe('string');
		// Shiki CSS variables theme produces style attributes with var(--shiki-...)
		expect(result.children[0] as string).toContain('style=');
	});

	it('should pass through nodes without data-language', async () => {
		const hl = await createHighlightTransform({ langs: ['javascript'] });
		const tree = tag('p', {}, ['Hello world']);

		const result = hl(tree) as SerializedTag;
		expect(result.children).toEqual(['Hello world']);
		expect(result.attributes['data-codeblock']).toBeUndefined();
	});

	it('should handle unknown languages gracefully', async () => {
		const hl = await createHighlightTransform({ langs: ['javascript'] });
		const tree = tag('code', { 'data-language': 'markdoc' }, ['{% hint %}']);

		const result = hl(tree) as SerializedTag;
		// Should not crash — falls back to no highlighting
		expect(result.attributes['data-codeblock']).toBeUndefined();
		expect(result.children).toEqual(['{% hint %}']);
	});

	it('should recurse into nested structures', async () => {
		const hl = await createHighlightTransform({ langs: ['javascript'] });
		const tree = tag('pre', { 'data-language': 'javascript' }, [
			tag('code', { 'data-language': 'javascript' }, ['const x = 1;']),
		]);

		const result = hl(tree) as SerializedTag;
		// pre has data-language but its children are tags, not text — skipped
		expect(result.attributes['data-codeblock']).toBeUndefined();
		// Inner code element should be highlighted
		const code = result.children[0] as SerializedTag;
		expect(code.attributes['data-codeblock']).toBe(true);
		expect(typeof code.children[0]).toBe('string');
	});

	it('should skip elements with data-language but no text children', async () => {
		const hl = await createHighlightTransform({ langs: ['javascript'] });
		const tree = tag('div', { 'data-language': 'javascript' }, [
			tag('span', {}, ['nested']),
		]);

		const result = hl(tree) as SerializedTag;
		expect(result.attributes['data-codeblock']).toBeUndefined();
	});

	it('should accept a custom highlight function', async () => {
		const customHl = (code: string, lang: string) => `<custom>${code}</custom>`;
		const hl = await createHighlightTransform({ highlight: customHl });
		const tree = tag('code', { 'data-language': 'anything' }, ['hello']);

		const result = hl(tree) as SerializedTag;
		expect(result.attributes['data-codeblock']).toBe(true);
		expect(result.children[0]).toBe('<custom>hello</custom>');
	});

	it('should highlight markdoc code blocks', async () => {
		const hl = await createHighlightTransform();
		const tree = tag('code', { 'data-language': 'markdoc' }, ['{% hint type="warning" %}\nBe careful\n{% /hint %}']);

		const result = hl(tree) as SerializedTag;
		expect(result.attributes['data-codeblock']).toBe(true);
		expect(typeof result.children[0]).toBe('string');
		expect(result.children[0] as string).toContain('style=');
	});

	it('should handle null and string nodes in the tree', async () => {
		const hl = await createHighlightTransform({ langs: ['javascript'] });

		expect(hl(null as any)).toBeNull();
		expect(hl('plain text' as any)).toBe('plain text');
		expect(hl(42 as any)).toBe(42);
	});
});

describe('highlight transform — .css property', () => {
	it('should return empty css for default CSS variables theme', async () => {
		const hl = await createHighlightTransform({ langs: ['javascript'] });
		expect(hl.css).toBe('');
	});

	it('should return empty css for custom highlight function', async () => {
		const hl = await createHighlightTransform({ highlight: (code) => code });
		expect(hl.css).toBe('');
	});
});

describe('highlight transform — single named theme', () => {
	it('should highlight with inline hex colors', async () => {
		const hl = await createHighlightTransform({ theme: 'github-dark', langs: ['javascript'] });
		const tree = tag('code', { 'data-language': 'javascript' }, ['const x = 1;']);

		const result = hl(tree) as SerializedTag;
		expect(result.attributes['data-codeblock']).toBe(true);
		const html = result.children[0] as string;
		// Should contain inline hex color, not CSS variable references
		expect(html).toContain('style=');
		expect(html).not.toContain('var(--shiki-token');
	});

	it('should generate css with background color override', async () => {
		const hl = await createHighlightTransform({ theme: 'github-dark', langs: ['javascript'] });
		expect(hl.css).toContain('--rf-color-code-bg:');
		expect(hl.css).toContain('--rf-color-code-text:');
	});

	it('should not generate dual-theme toggle rules', async () => {
		const hl = await createHighlightTransform({ theme: 'github-dark', langs: ['javascript'] });
		expect(hl.css).not.toContain('[data-theme="dark"]');
		expect(hl.css).not.toContain('--shiki-dark');
	});
});

describe('highlight transform — dual themes', () => {
	it('should highlight with inline light colors and dark CSS variables', async () => {
		const hl = await createHighlightTransform({
			theme: { light: 'github-light', dark: 'github-dark' },
			langs: ['javascript'],
		});
		const tree = tag('code', { 'data-language': 'javascript' }, ['const x = 1;']);

		const result = hl(tree) as SerializedTag;
		expect(result.attributes['data-codeblock']).toBe(true);
		const html = result.children[0] as string;
		// With defaultColor: 'light', spans have inline color + --shiki-dark variable
		expect(html).toContain('style="color:');
		expect(html).toContain('--shiki-dark:');
	});

	it('should generate css with light and dark background overrides', async () => {
		const hl = await createHighlightTransform({
			theme: { light: 'github-light', dark: 'github-dark' },
			langs: ['javascript'],
		});
		expect(hl.css).toContain('pre[data-language]');
		expect(hl.css).toContain('background-color:');
		expect(hl.css).toContain('[data-theme="dark"]');
	});

	it('should generate dark-mode span toggle rules with !important', async () => {
		const hl = await createHighlightTransform({
			theme: { light: 'github-light', dark: 'github-dark' },
			langs: ['javascript'],
		});
		expect(hl.css).toContain('[data-codeblock] span');
		expect(hl.css).toContain('color: var(--shiki-dark) !important');
		// No light-mode span rules — light colors are inline
		expect(hl.css).not.toContain('var(--shiki-light)');
	});

	it('should include prefers-color-scheme fallback', async () => {
		const hl = await createHighlightTransform({
			theme: { light: 'github-light', dark: 'github-dark' },
			langs: ['javascript'],
		});
		expect(hl.css).toContain('prefers-color-scheme: dark');
		expect(hl.css).toContain(':root:not([data-theme="light"])');
	});
});
