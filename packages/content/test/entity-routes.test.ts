import { describe, it, expect } from 'vitest';
import { createEntityRoutesHooks } from '../src/entity-routes.js';
import type { ContributePagesContext, EntityRegistration, EntityRegistry } from '@refrakt-md/types';

function registry(entries: EntityRegistration[]): EntityRegistry {
	return {
		register() {},
		getAll: (type) => entries.filter((e) => e.type === type),
		getById: (type, id) => entries.find((e) => e.type === type && e.id === id),
		getByUrl: (type, url) => entries.filter((e) => e.type === type && e.sourceUrl === url),
		getTypes: () => [...new Set(entries.map((e) => e.type))],
	} as EntityRegistry;
}

function ctx(entries: EntityRegistration[], siteConfig: unknown): ContributePagesContext & { warnings: string[]; errors: string[] } {
	const warnings: string[] = [];
	const errors: string[] = [];
	return {
		registry: registry(entries),
		siteConfig,
		projectRoot: '/root',
		info() {},
		warn(m) { warnings.push(m); },
		error(m) { errors.push(m); },
		warnings,
		errors,
	};
}

const partials: Record<string, string> = { 'templates:decision.md': '# {% $item.data.title %}\n\nA decision.' };
const hooks = createEntityRoutesHooks((name) => partials[name]);

const specs: EntityRegistration[] = [
	{ type: 'spec', id: 'SPEC-1', sourceUrl: '/plan/spec-1/', data: { title: 'First', status: 'accepted' } },
	{ type: 'spec', id: 'SPEC-2', sourceUrl: '/plan/spec-2/', data: { title: 'Second', status: 'draft' } },
];

describe('entityRoutes adapter', () => {
	it('generates one page per matching entity with substitution + bound $item', () => {
		const c = ctx(specs, { entityRoutes: [{ type: 'spec', url: '/specs/{id}/', title: '{title}', render: '{% expand $item.id /%}' }] });
		const pages = hooks.contributePages!(c) as Array<{ url: string; title?: string; content: string; variables?: Record<string, unknown> }>;
		expect(pages).toHaveLength(2);
		expect(pages[0]).toMatchObject({ url: '/specs/SPEC-1/', title: 'First', content: '{% expand $item.id /%}' });
		expect((pages[0].variables!.item as { id: string }).id).toBe('SPEC-1');
	});

	it('applies the filter', () => {
		const c = ctx(specs, { entityRoutes: [{ type: 'spec', filter: 'status:accepted', url: '/specs/{id}/', render: 'x' }] });
		const pages = hooks.contributePages!(c) as Array<{ url: string }>;
		expect(pages).toHaveLength(1);
		expect(pages[0].url).toBe('/specs/SPEC-1/');
	});

	it('back-fills each matched entity sourceUrl with the generated route', () => {
		const entries = JSON.parse(JSON.stringify(specs)) as EntityRegistration[];
		const c = ctx(entries, { entityRoutes: [{ type: 'spec', url: '/s/{id}/', render: 'x' }] });
		hooks.contributePages!(c);
		expect(entries[0].sourceUrl).toBe('/s/SPEC-1/');
	});

	it('substitutes frontmatter string values', () => {
		const c = ctx(specs, { entityRoutes: [{ type: 'spec', url: '/s/{id}/', render: 'x', frontmatter: { category: 'spec', label: '{title}' } }] });
		const pages = hooks.contributePages!(c) as Array<{ frontmatter?: Record<string, unknown> }>;
		expect(pages[0].frontmatter).toMatchObject({ category: 'spec', label: 'First' });
	});

	it('resolves a render-template partial', () => {
		const c = ctx(specs.slice(0, 1), { entityRoutes: [{ type: 'spec', url: '/s/{id}/', 'render-template': 'templates:decision.md' }] });
		const pages = hooks.contributePages!(c) as Array<{ content: string }>;
		expect(pages[0].content).toContain('$item.data.title');
	});

	it('errors when both render and render-template are set', () => {
		const c = ctx(specs, { entityRoutes: [{ type: 'spec', url: '/s/{id}/', render: 'x', 'render-template': 'templates:decision.md' }] });
		const pages = hooks.contributePages!(c);
		expect(pages).toHaveLength(0);
		expect(c.errors.length).toBe(1);
	});

	it('is a no-op without entityRoutes config', () => {
		const c = ctx(specs, {});
		expect(hooks.contributePages!(c)).toHaveLength(0);
	});
});
