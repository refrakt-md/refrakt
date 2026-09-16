import { describe, it, expect } from 'vitest';
import { memoryProjectFiles } from '@refrakt-md/types/project-files';
import { createTransform } from '@refrakt-md/transform';
import { baseConfig, collectJsonLd } from '@refrakt-md/runes';
import { ContentTree } from '../src/content-tree.js';
import { loadContentFromTree } from '../src/site.js';

// SPEC-130 / WORK-563 — `seo` is harvested after the cross-page pipeline, and
// the two harvest points agree.
//
// The per-page harvest used to run in Phase 1, before `register` / `aggregate`
// / `postProcess` had touched anything, so every sentinel resolved in Phase 4
// was invisible to it. `{% breadcrumb auto=true %}` builds its renderables in a
// `postProcess` hook: the page rendered a correct `BreadcrumbList` and published
// none of it. Nothing caught that, because no pipeline test asserted on `seo` at
// all — this file is the one that does.

const AUTO = '{% breadcrumb auto=true /%}';

const PAGES = new Map<string, string>([
	['content/index.md', '---\ntitle: Home\n---\n\n# Home\n\nThe root page.\n'],
	// Depth 1 — the one depth at which the ancestor walk works today, so this is
	// the page that can carry a genuinely multi-item trail. See BUG-018.
	['content/about.md', `---\ntitle: About\n---\n\n${AUTO}\n\n# About\n\nOne level deep.\n`],
	['content/guide/index.md', '---\ntitle: Guide\n---\n\n# Guide\n\nSection index.\n'],
	[
		'content/guide/intro.md',
		`---\ntitle: Intro\n---\n\n${AUTO}\n\n# Guide intro\n\nTwo levels deep.\n`,
	],
]);

async function build(files = PAGES) {
	const tree = ContentTree.fromContentMap(files, { contentDir: 'content' });
	return loadContentFromTree(tree, {
		projectFiles: memoryProjectFiles(files),
		projectRoot: '/virtual',
		basePath: '/',
	});
}

/** Sort object keys recursively; array order is left alone. */
function normalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(normalize);
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const key of Object.keys(value as object).sort()) {
			out[key] = normalize((value as Record<string, unknown>)[key]);
		}
		return out;
	}
	return value;
}

const entitiesOfType = (jsonLd: object[], type: string) =>
	jsonLd.filter((e) => (e as Record<string, unknown>)['@type'] === type);

describe('seo is harvested after the pipeline (WORK-563)', () => {
	it('publishes the BreadcrumbList that `breadcrumb auto` renders', async () => {
		// The bug, as a test. Before the harvest moved, this page rendered a
		// correct trail in the HTML and carried zero JSON-LD.
		const site = await build();
		const about = site.pages.find((p) => p.route.url === '/about');
		expect(about, 'no /about page').toBeDefined();

		const lists = entitiesOfType(about!.seo.jsonLd, 'BreadcrumbList');
		expect(lists, 'breadcrumb auto published no BreadcrumbList').toHaveLength(1);

		const items = (lists[0] as Record<string, unknown>).itemListElement as
			| Record<string, unknown>[]
			| undefined;
		expect(items, 'BreadcrumbList carries no itemListElement').toBeDefined();
		expect(Array.isArray(items), 'a two-item trail should be an array').toBe(true);
		expect(items!.map((i) => i.name)).toEqual(['Home', 'About']);
		// Strings since WORK-571: the position is generated as `String(index + 1)`
		// so the RDFa attribute and the JSON-LD say the same thing (D8). A number
		// here and a string in the markup is drift the invariant below would
		// otherwise have to tolerate.
		expect(items!.map((i) => i.position)).toEqual(['1', '2']);
	});

	it('nests its items rather than floating them up as detached entities', async () => {
		// `collectJsonLd` nests a typed node into its parent only when that node
		// carries *both* `typeof` and `property`, and on this path the applier is
		// what supplies the `property`. Without it the hook emitted an empty
		// BreadcrumbList *and* a bare ListItem beside it — two top-level entities,
		// neither describing anything. Nothing must float.
		const site = await build();
		const about = site.pages.find((p) => p.route.url === '/about')!;
		expect(entitiesOfType(about.seo.jsonLd, 'ListItem'), 'a ListItem floated to top level').toEqual(
			[],
		);
	});

	it('renders the same trail it publishes', async () => {
		// Guards the half-fix: publishing a trail that does not match the rendered
		// one would pass the assertions above while still being wrong.
		const site = await build();
		const about = site.pages.find((p) => p.route.url === '/about')!;
		const rendered = JSON.stringify(about.renderable);
		expect(rendered).toContain('BreadcrumbList');
		expect(rendered).toContain('Home');
		expect(rendered).toContain('About');
	});

	it('publishes a truncated trail faithfully (BUG-018)', async () => {
		// `deriveParentUrl` returns `/guide/` while the router registers `/guide`,
		// so the ancestor walk stops dead below depth 1 and an auto breadcrumb
		// renders only the current page. That is BUG-018, a rendering defect, and
		// deliberately not fixed here — WORK-563 moves *where* the harvest happens.
		//
		// What this item does guarantee is that whatever is rendered is what gets
		// published. Pinned so the fix for BUG-018 shows up here as a diff rather
		// than landing unnoticed.
		const site = await build();
		const intro = site.pages.find((p) => p.route.url === '/guide/intro')!;
		const list = entitiesOfType(intro.seo.jsonLd, 'BreadcrumbList')[0] as Record<string, unknown>;
		expect(list, 'no BreadcrumbList on the nested page').toBeDefined();
		// An array even at one item, since WORK-571 declared `itemListElement` a
		// list (D6) — the shape no longer varies with how deep the page sits.
		expect(list.itemListElement).toMatchObject([{ name: 'Intro', position: '1' }]);
	});

	it('agrees at both harvest points, page-level, through runPipeline', async () => {
		// The two-point invariant at page granularity. `collectJsonLd` over the
		// enriched (pre-engine) tree, and over the same tree after
		// `createTransform`, must describe the same graph.
		//
		// What this proves is that *our reader* sees the same graph at both
		// points. `collectJsonLd` is an RDFa subset — no @about, @resource,
		// @vocab, prefixes or @rel — so it is not a claim about what a conformant
		// distiller would extract.
		const site = await build();
		const identity = createTransform(baseConfig);

		for (const page of site.pages) {
			const preEngine = collectJsonLd(page.renderable as never);
			const serialized = JSON.parse(JSON.stringify(page.renderable));
			const postEngine = collectJsonLd(identity(serialized) as never);
			expect(normalize(postEngine), `${page.route.url} drifts between harvest points`).toEqual(
				normalize(preEngine),
			);
		}
	});

	it('keeps array order significant when comparing', async () => {
		// A reordered breadcrumb is a real defect, so the normaliser must not hide
		// one. Sorting keys is fine; sorting items is not.
		const site = await build();
		const intro = site.pages.find((p) => p.route.url === '/guide/intro')!;
		const list = entitiesOfType(intro.seo.jsonLd, 'BreadcrumbList')[0] as Record<string, unknown>;
		const items = list.itemListElement;
		if (!Array.isArray(items) || items.length < 2) return; // single-item trail, nothing to order
		const reversed = [...items].reverse();
		expect(normalize({ itemListElement: reversed })).not.toEqual(
			normalize({ itemListElement: items }),
		);
	});

	it('recomputes og alongside jsonLd', async () => {
		// `extractSeo` computes both, so the move carries `og` with it — which
		// matters because `postProcess` can inject content that changes the first
		// h1 / paragraph / image `extractOgMeta` reads.
		const site = await build();
		for (const page of site.pages) {
			expect(page.seo.og, `${page.route.url} has no og`).toBeDefined();
			expect(page.seo.og.url, `${page.route.url} og.url not set`).toBe(page.route.url);
		}
	});

	it('harvests every page, not only the ones with schema', async () => {
		// Guards the loop itself: a recomputation that skipped pages would leave
		// stale Phase-1 values behind, which is the failure mode that made the
		// original bug invisible.
		const site = await build();
		expect(site.pages.length).toBeGreaterThanOrEqual(3);
		for (const page of site.pages) {
			expect(page.seo, `${page.route.url} has no seo`).toBeDefined();
			expect(Array.isArray(page.seo.jsonLd), `${page.route.url} jsonLd not an array`).toBe(true);
		}
	});
});
