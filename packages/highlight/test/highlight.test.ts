import { describe, it, expect } from 'vitest';
import { createHighlightTransform } from '../src/index.js';
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

	it('should handle null and string nodes in the tree', async () => {
		const hl = await createHighlightTransform({ langs: ['javascript'] });

		expect(hl(null as any)).toBeNull();
		expect(hl('plain text' as any)).toBe('plain text');
		expect(hl(42 as any)).toBe(42);
	});
});
