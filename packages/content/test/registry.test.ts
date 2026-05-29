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

	describe('relationship graph (SPEC-072)', () => {
		function seeded() {
			const r = new EntityRegistryImpl();
			r.register({ type: 'work', id: 'WORK-1', data: { title: 'One' } });
			r.register({ type: 'spec', id: 'SPEC-1', data: { title: 'Spec One' } });
			r.register({ type: 'bug', id: 'BUG-1', data: { title: 'Bug One' } });
			return r;
		}

		it('relate + getRelated resolves targets and is directed', () => {
			const r = seeded();
			r.relate({ fromId: 'WORK-1', toId: 'SPEC-1', kind: 'implements', toType: 'spec' });
			const out = r.getRelated('WORK-1');
			expect(out).toHaveLength(1);
			expect(out[0].kind).toBe('implements');
			expect(out[0].target.id).toBe('SPEC-1');
			expect(out[0].target.data.title).toBe('Spec One');
			// directed: SPEC-1 has no outgoing edge unless contributed
			expect(r.getRelated('SPEC-1')).toHaveLength(0);
		});

		it('dedupes exact (fromId, toId, kind) edges', () => {
			const r = seeded();
			r.relate({ fromId: 'WORK-1', toId: 'SPEC-1', kind: 'implements' });
			r.relate({ fromId: 'WORK-1', toId: 'SPEC-1', kind: 'implements' });
			expect(r.getRelated('WORK-1')).toHaveLength(1);
		});

		it('filters by kind and target type, and drops unknown targets', () => {
			const r = seeded();
			r.relate({ fromId: 'WORK-1', toId: 'SPEC-1', kind: 'implements' });
			r.relate({ fromId: 'WORK-1', toId: 'BUG-1', kind: 'related' });
			r.relate({ fromId: 'WORK-1', toId: 'GHOST-9', kind: 'related' });
			expect(r.getRelated('WORK-1')).toHaveLength(2); // GHOST-9 dropped
			expect(r.getRelated('WORK-1', { kind: 'implements' })).toHaveLength(1);
			expect(r.getRelated('WORK-1', { type: 'bug' }).map((e) => e.toId)).toEqual(['BUG-1']);
		});

		it('resolves target by scanning types when toType is omitted', () => {
			const r = seeded();
			r.relate({ fromId: 'WORK-1', toId: 'SPEC-1', kind: 'implements' });
			expect(r.getRelated('WORK-1')[0].target.type).toBe('spec');
		});
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

			// Looked up without a pageUrl, the cross-page fallback picks the
			// first page-scoped match in registration order. Callers wanting
			// strict resolution pass `pageUrl`.
			expect(registry.getById('drawer', 'auth')?.data.title).toBe('Page A auth drawer');
		});

		it('cross-page lookup finds a page-scoped entry from any other page', () => {
			const registry = new EntityRegistryImpl();
			registry.register({
				type: 'drawer',
				id: 'auth',
				scope: 'page',
				sourceUrl: '/origin-page/',
				data: { title: 'Origin' },
			});

			// From a different page, the page-scoped match is reached via the
			// cross-page fallback.
			const hit = registry.getById('drawer', 'auth', '/some-other-page/');
			expect(hit).toBeDefined();
			expect(hit!.data.title).toBe('Origin');
		});

		it('normalises trailing slashes when keying page-scoped entries', () => {
			const registry = new EntityRegistryImpl();
			registry.register({
				type: 'drawer',
				id: 'd',
				scope: 'page',
				sourceUrl: '/path/',
				data: {},
			});
			// Either lookup shape (with or without trailing slash) returns
			// the same entry — adapters that normalise URLs differently still
			// resolve correctly.
			expect(registry.getById('drawer', 'd', '/path/')).toBeDefined();
			expect(registry.getById('drawer', 'd', '/path')).toBeDefined();
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
