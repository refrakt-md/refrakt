import { describe, it, expect } from 'vitest';
import { EntityRegistryImpl } from '../src/registry.js';

describe('EntityRegistryImpl', () => {
	it('registers and retrieves an entity by id', () => {
		const registry = new EntityRegistryImpl();
		registry.register({
			type: 'page',
			id: '/docs/',
			sourceUrl: '/docs/',
			data: { title: 'Docs', url: '/docs/' },
		});

		const result = registry.getById('page', '/docs/');
		expect(result).toBeDefined();
		expect(result?.data.title).toBe('Docs');
	});

	it('getAll returns all entities of a type in insertion order', () => {
		const registry = new EntityRegistryImpl();
		registry.register({ type: 'page', id: '/a/', sourceUrl: '/a/', data: { title: 'A' } });
		registry.register({ type: 'page', id: '/b/', sourceUrl: '/b/', data: { title: 'B' } });
		registry.register({ type: 'heading', id: '/a/#intro', sourceUrl: '/a/', data: { text: 'Intro' } });

		const pages = registry.getAll('page');
		expect(pages).toHaveLength(2);
		expect(pages[0].id).toBe('/a/');
		expect(pages[1].id).toBe('/b/');

		const headings = registry.getAll('heading');
		expect(headings).toHaveLength(1);
	});

	it('getByUrl returns entities registered from a specific page', () => {
		const registry = new EntityRegistryImpl();
		registry.register({ type: 'heading', id: '/a/#h1', sourceUrl: '/a/', data: { text: 'H1' } });
		registry.register({ type: 'heading', id: '/a/#h2', sourceUrl: '/a/', data: { text: 'H2' } });
		registry.register({ type: 'heading', id: '/b/#h1', sourceUrl: '/b/', data: { text: 'H1' } });

		const aHeadings = registry.getByUrl('heading', '/a/');
		expect(aHeadings).toHaveLength(2);

		const bHeadings = registry.getByUrl('heading', '/b/');
		expect(bHeadings).toHaveLength(1);

		expect(registry.getByUrl('heading', '/c/')).toHaveLength(0);
	});

	it('returns undefined for missing entities', () => {
		const registry = new EntityRegistryImpl();
		expect(registry.getById('page', '/missing/')).toBeUndefined();
		expect(registry.getAll('missing')).toHaveLength(0);
		expect(registry.getByUrl('page', '/missing/')).toHaveLength(0);
	});

	it('last-writer-wins on id collision', () => {
		const registry = new EntityRegistryImpl();
		registry.register({ type: 'page', id: '/docs/', sourceUrl: '/docs/', data: { title: 'First' } });
		registry.register({ type: 'page', id: '/docs/', sourceUrl: '/docs/', data: { title: 'Second' } });

		const result = registry.getById('page', '/docs/');
		expect(result?.data.title).toBe('Second');

		// getAll should only have one entry for the id
		expect(registry.getAll('page')).toHaveLength(1);
	});

	describe('page-scoped entries (SPEC-060)', () => {
		it('two pages can register the same (type, id) when scope is "page"', () => {
			const registry = new EntityRegistryImpl();
			registry.register({
				type: 'drawer',
				id: 'auth',
				scope: 'page',
				sourceUrl: '/page-a/',
				data: { title: 'Page A auth drawer' },
			});
			registry.register({
				type: 'drawer',
				id: 'auth',
				scope: 'page',
				sourceUrl: '/page-b/',
				data: { title: 'Page B auth drawer' },
			});

			// Both entries coexist in getAll.
			expect(registry.getAll('drawer')).toHaveLength(2);

			// Looked up with a pageUrl, each page sees its own entry.
			expect(registry.getById('drawer', 'auth', '/page-a/')?.data.title).toBe('Page A auth drawer');
			expect(registry.getById('drawer', 'auth', '/page-b/')?.data.title).toBe('Page B auth drawer');

			// Looked up without a pageUrl, no site-scoped entry exists so the
			// result is undefined.
			expect(registry.getById('drawer', 'auth')).toBeUndefined();
		});

		it('page-scoped match takes precedence over a site-scoped match of the same id', () => {
			const registry = new EntityRegistryImpl();
			registry.register({
				type: 'term',
				id: 'oauth',
				sourceUrl: '/glossary/',
				data: { title: 'Site-scoped OAuth term' },
			});
			registry.register({
				type: 'term',
				id: 'oauth',
				scope: 'page',
				sourceUrl: '/auth-guide/',
				data: { title: 'Page-local OAuth note' },
			});

			// From /auth-guide/, the page-scoped entry wins.
			expect(registry.getById('term', 'oauth', '/auth-guide/')?.data.title).toBe('Page-local OAuth note');

			// From any other page, the site-scoped entry is the fallback.
			expect(registry.getById('term', 'oauth', '/some-other-page/')?.data.title).toBe('Site-scoped OAuth term');

			// Without a pageUrl, only the site-scoped entry is reachable.
			expect(registry.getById('term', 'oauth')?.data.title).toBe('Site-scoped OAuth term');
		});

		it('getByUrl returns page-scoped entries from that page', () => {
			const registry = new EntityRegistryImpl();
			registry.register({
				type: 'drawer',
				id: 'auth',
				scope: 'page',
				sourceUrl: '/page-a/',
				data: { title: 'Auth' },
			});
			registry.register({
				type: 'drawer',
				id: 'billing',
				scope: 'page',
				sourceUrl: '/page-a/',
				data: { title: 'Billing' },
			});

			const drawers = registry.getByUrl('drawer', '/page-a/');
			expect(drawers).toHaveLength(2);
			expect(drawers.map(d => d.id).sort()).toEqual(['auth', 'billing']);
		});

		it('re-registering the same (type, id, sourceUrl) page-scoped entry overwrites the prior one', () => {
			const registry = new EntityRegistryImpl();
			registry.register({
				type: 'drawer',
				id: 'auth',
				scope: 'page',
				sourceUrl: '/page-a/',
				data: { title: 'First' },
			});
			registry.register({
				type: 'drawer',
				id: 'auth',
				scope: 'page',
				sourceUrl: '/page-a/',
				data: { title: 'Second' },
			});

			expect(registry.getById('drawer', 'auth', '/page-a/')?.data.title).toBe('Second');
			expect(registry.getAll('drawer')).toHaveLength(1);
			expect(registry.getByUrl('drawer', '/page-a/')).toHaveLength(1);
		});
	});
});
