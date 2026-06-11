import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { corePipelineHooks } from '../../runes/src/config.js';
import { EntityRegistryImpl } from '../src/registry.js';
import { createPageEntityHooks } from '../src/page-entities.js';
import type { TransformedPage } from '@refrakt-md/types';

function page(url: string, frontmatter: Record<string, unknown>): TransformedPage {
	return {
		url,
		title: (frontmatter.title as string) ?? url,
		headings: [],
		frontmatter,
		renderable: null,
	} as unknown as TransformedPage;
}

function registerAll(pages: TransformedPage[], siteConfig: unknown) {
	const registry = new EntityRegistryImpl();
	const warnings: string[] = [];
	const ctx = { info() {}, warn(m: string) { warnings.push(m); }, error() {} } as any;
	corePipelineHooks.register!(pages, registry, ctx);              // page + heading entities
	createPageEntityHooks(siteConfig).register!(pages, registry, ctx); // typed entities
	return { registry, warnings };
}

describe('createPageEntityHooks (SPEC-092 L2/L3)', () => {
	it('registers a typed entity from frontmatter type/id, reusing page data', () => {
		const { registry } = registerAll([
			page('/runes/card/', { title: 'Card', type: 'rune', id: 'card', tags: ['container'], category: 'Content' }),
		], {});

		const rune = registry.getById('rune', 'card');
		expect(rune).toBeDefined();
		expect(rune!.sourceUrl).toBe('/runes/card/');
		expect(rune!.data.title).toBe('Card');
		expect(rune!.data.tags).toEqual(['container']);   // inherits page passthrough
		expect(rune!.data.category).toBe('Content');
		expect(rune!.data.type).toBeUndefined();          // entity-decl keys reserved out of data
		expect(rune!.data.id).toBeUndefined();
		// still registered as a page too
		expect(registry.getById('page', '/runes/card/')).toBeDefined();
	});

	it('registers via a routeRules entity rule, id defaulting to the URL', () => {
		const siteConfig = { routeRules: [{ pattern: 'runes/**', layout: 'docs', entity: 'rune' }] };
		const { registry } = registerAll([page('/runes/hint/', { title: 'Hint' })], siteConfig);

		expect(registry.getById('rune', '/runes/hint/')?.data.title).toBe('Hint');
	});

	it('frontmatter type overrides the routeRules rule', () => {
		const siteConfig = { routeRules: [{ pattern: 'runes/**', layout: 'docs', entity: 'rune' }] };
		const { registry } = registerAll([page('/runes/special/', { title: 'Special', type: 'widget' })], siteConfig);

		expect(registry.getById('widget', '/runes/special/')).toBeDefined();
		expect(registry.getAll('rune')).toHaveLength(0);
	});

	it('warns on a duplicate (type, id)', () => {
		const { warnings } = registerAll([
			page('/a/', { type: 'rune', id: 'dup', title: 'A' }),
			page('/b/', { type: 'rune', id: 'dup', title: 'B' }),
		], {});
		expect(warnings.some(w => w.includes('rune:dup'))).toBe(true);
	});

	it('is a no-op when no page declares a type and no rule matches', () => {
		const { registry } = registerAll([page('/about/', { title: 'About' })], {});
		expect(registry.getTypes()).not.toContain('rune');
	});
});
