import { describe, it, expect } from 'vitest';
import { memoryProjectFiles } from '@refrakt-md/types/project-files';
import { ContentTree } from '../src/content-tree.js';
import { loadContentFromTree } from '../src/site.js';

// BUG-018 — `breadcrumb auto` lost every ancestor below depth 1.
//
// `deriveParentUrl` spelled a parent `/docs/` while the router registers
// `/docs`, so every lookup keyed on `parentUrl` missed. The pipeline fixtures
// in `packages/runes/test` all fed trailing-slash URLs the router never emits,
// under which the lookups matched. This file goes through a real
// `loadContentFromTree` build so the URLs are the router's own.

const AUTO = '{% breadcrumb auto=true /%}';

const PAGES = new Map<string, string>([
	['content/index.md', '---\ntitle: Home\n---\n\n# Home\n'],
	['content/about.md', `---\ntitle: About\n---\n\n${AUTO}\n\n# About\n`],
	['content/docs/index.md', '---\ntitle: Docs\n---\n\n{% nav auto=true /%}\n\n# Docs\n'],
	['content/docs/guide.md', `---\ntitle: Guide\n---\n\n${AUTO}\n\n# Guide\n`],
	['content/docs/api/index.md', '---\ntitle: API\n---\n\n{% pagination auto=true /%}\n\n# API\n'],
	['content/docs/api/ref.md', `---\ntitle: Ref\n---\n\n${AUTO}\n\n# Ref\n`],
]);

async function build(files = PAGES, basePath = '/') {
	const tree = ContentTree.fromContentMap(files, { contentDir: 'content' });
	return loadContentFromTree(tree, {
		projectFiles: memoryProjectFiles(files),
		projectRoot: '/virtual',
		basePath,
	});
}

type Site = Awaited<ReturnType<typeof build>>;

function page(site: Site, url: string) {
	const found = site.pages.find((p) => p.route.url === url);
	expect(found, `no page at ${url}`).toBeDefined();
	return found!;
}

/** The trail as published in JSON-LD. */
function publishedTrail(site: Site, url: string): unknown[] {
	const list = page(site, url).seo.jsonLd.find(
		(e) => (e as Record<string, unknown>)['@type'] === 'BreadcrumbList',
	) as Record<string, unknown> | undefined;
	expect(list, `no BreadcrumbList on ${url}`).toBeDefined();
	return (list!.itemListElement as Record<string, unknown>[]).map((i) => i.name);
}

/** The trail as rendered: the breadcrumb's `<li>` items, in order, with the
 *  link each ancestor carries. */
function renderedTrail(site: Site, url: string): Array<[string, string | null]> {
	const items: Array<[string, string | null]> = [];
	const walk = (n: unknown): void => {
		if (Array.isArray(n)) return n.forEach(walk);
		if (!n || typeof n !== 'object') return;
		const node = n as { name?: string; attributes?: Record<string, unknown>; children?: unknown[] };
		if (node.attributes?.['data-rune'] === 'breadcrumb-item') {
			const link = node.children?.find((c) => (c as { name?: string })?.name === 'a') as
				| { attributes: { href: string }; children: string[] }
				| undefined;
			const span = node.children?.find((c) => (c as { name?: string })?.name === 'span') as
				| { children: string[] }
				| undefined;
			items.push([String((link ?? span)?.children[0]), link ? link.attributes.href : null]);
			return;
		}
		node.children?.forEach(walk);
	};
	walk(page(site, url).renderable);
	return items;
}

describe('breadcrumb auto at depth (BUG-018)', () => {
	it('depth 1: /about → Home > About', async () => {
		const site = await build();
		expect(renderedTrail(site, '/about')).toEqual([
			['Home', '/'],
			['About', null],
		]);
		expect(publishedTrail(site, '/about')).toEqual(['Home', 'About']);
	});

	it('depth 2: /docs/guide → Home > Docs > Guide', async () => {
		const site = await build();
		expect(renderedTrail(site, '/docs/guide')).toEqual([
			['Home', '/'],
			['Docs', '/docs'],
			['Guide', null],
		]);
		expect(publishedTrail(site, '/docs/guide')).toEqual(['Home', 'Docs', 'Guide']);
	});

	it('depth 3: /docs/api/ref → Home > Docs > API > Ref', async () => {
		const site = await build();
		expect(renderedTrail(site, '/docs/api/ref')).toEqual([
			['Home', '/'],
			['Docs', '/docs'],
			['API', '/docs/api'],
			['Ref', null],
		]);
		expect(publishedTrail(site, '/docs/api/ref')).toEqual(['Home', 'Docs', 'API', 'Ref']);
	});

	it('emits no pipeline diagnostics for a well-formed tree', async () => {
		const site = await build();
		expect(site.pipelineWarnings).toEqual([]);
	});

	it('steps over a directory with no index page instead of stopping', async () => {
		const files = new Map(PAGES);
		files.delete('content/docs/index.md');
		const site = await build(files);
		expect(publishedTrail(site, '/docs/guide')).toEqual(['Home', 'Guide']);
		expect(publishedTrail(site, '/docs/api/ref')).toEqual(['Home', 'API', 'Ref']);
	});

	it('resolves under a base path, whose root the router spells with a slash', async () => {
		const site = await build(PAGES, '/en');
		expect(page(site, '/en/').route.url).toBe('/en/');
		expect(publishedTrail(site, '/en/docs/api/ref')).toEqual(['Home', 'Docs', 'API', 'Ref']);
	});
});

// The bug's suspected wider blast radius, measured: the same key fed every
// other `parentUrl` consumer, and each of them was broken the same way.
describe('other parentUrl consumers (BUG-018 blast radius)', () => {
	it('pageTree nests rather than flattening every page under root', async () => {
		const site = await build();
		type Node = { url: string; children: Node[] };
		const shape = (n: Node): unknown => ({ [n.url]: n.children.map(shape) });
		const tree = (site.aggregated.__core__ as { pageTree: Node }).pageTree;
		expect(shape(tree)).toEqual({
			'/': [
				{ '/about': [] },
				{ '/docs': [{ '/docs/guide': [] }, { '/docs/api': [{ '/docs/api/ref': [] }] }] },
			],
		});
	});

	it('nav auto on a section index lists its child pages', async () => {
		const site = await build();
		const json = JSON.stringify(page(site, '/docs').renderable);
		expect(json).toContain('"href":"/docs/guide"');
		expect(json).toContain('"href":"/docs/api"');
	});

	it('auto pagination is suppressed on a nested section index', async () => {
		const site = await build();
		expect(JSON.stringify(page(site, '/docs/api').renderable)).not.toContain('data-direction');
	});
});
