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
});
