import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent } from '../src/site.js';
import plan, { planPipelineHooks } from '@refrakt-md/plan';

// Real dogfood (SPEC-071, WORK-272): point loadContent at refrakt's own
// plan/ + plan-site/ via the sites.plan entry in refrakt.config.json. Asserts
// that refrakt's actual specs/work/decisions/milestones become entity pages
// and that the authored dashboards compose without warnings/errors.

const repoRoot = (() => {
	let dir = fileURLToPath(new URL('.', import.meta.url));
	while (dir !== '/') {
		if (existsSync(join(dir, 'refrakt.config.json'))) return dir;
		const parent = join(dir, '..');
		if (parent === dir) break;
		dir = parent;
	}
	throw new Error('repo root not found');
})();

interface EntityRoute {
	type: string;
	url: string;
	title: string;
	render?: string;
	'render-template'?: string;
}

interface PlanSiteConfig {
	contentDir: string;
	theme: unknown;
	plugins: string[];
	entityRoutes: EntityRoute[];
	routeRules?: Array<{ pattern: string; layout: string }>;
	baseUrl?: string;
}

function readPlanSiteConfig(): PlanSiteConfig {
	const cfg = JSON.parse(readFileSync(join(repoRoot, 'refrakt.config.json'), 'utf-8'));
	return cfg.sites.plan as PlanSiteConfig;
}

describe('refrakt plan site dogfood (SPEC-071 / WORK-272)', () => {
	it('config declares the plan site with entityRoutes for every plan entity type', () => {
		const planSite = readPlanSiteConfig();
		expect(planSite.contentDir).toBe('./plan-site/content');
		expect(planSite.plugins).toContain('@refrakt-md/plan');
		const types = planSite.entityRoutes.map((r) => r.type).sort();
		expect(types).toEqual(['bug', 'decision', 'milestone', 'spec', 'work']);
		// Each rule renders via either an inline `render` containing an
		// expand call, or a `render-template` partial under entity/. The
		// integration test below proves the templates expand and inline the
		// real entity body.
		for (const rule of planSite.entityRoutes) {
			const inline = rule.render ?? '';
			const tmpl = rule['render-template'] ?? '';
			const ok =
				/\{% expand .* \/%\}/.test(inline) ||
				/^entity\/[a-z]+\.md$/.test(tmpl);
			expect(ok, `entityRoutes rule for type "${rule.type}" must declare render or render-template`).toBe(true);
		}
	});

	// Heavy real-file integration build: reads the whole plan/ tree and runs the
	// full content pipeline (~5s in isolation, right at the 5s default). Under
	// vitest's parallel worker pool the CPU contention tips it past the default
	// timeout — a starvation timeout, not a hang or a race (WORK-330). Give it
	// generous headroom so the full suite is deterministic; a genuine hang would
	// still fail well within this bound.
	it('builds a browsable plan site from refrakt\'s real plan/ via entityRoutes + collection', async () => {
		const planSite = readPlanSiteConfig();
		// configure() registers the plan: file-root and primes the plugin's
		// scan target. Mirrors what the adapter does for the docs site.
		await planPipelineHooks.configure!({ config: { plan: { dir: 'plan' } }, configDir: repoRoot } as never);

		const site = await loadContent(
			join(repoRoot, 'plan-site', 'content'),
			'/',
			undefined,
			undefined,
			[plan],
			undefined,
			undefined,
			undefined,
			repoRoot,
			undefined,
			undefined,
			planSite as never,
		);

		const urls = site.pages.map((p) => p.route.url);

		// Authored dashboard URLs from plan-site/content/*.md.
		for (const dashboard of ['/', '/work', '/specs', '/bugs', '/decisions', '/milestones']) {
			expect(urls, `missing dashboard ${dashboard}`).toContain(dashboard);
		}

		// entityRoutes contributes one detail page per real plan entity.
		// We don't pin specific IDs (they evolve); instead we sample known
		// long-lived entities and assert overall counts are non-trivial.
		expect(urls).toContain('/specs/SPEC-071/');
		expect(urls).toContain('/work/WORK-272/');

		const workPages = urls.filter((u) => u.startsWith('/work/'));
		const specPages = urls.filter((u) => u.startsWith('/specs/'));
		expect(workPages.length).toBeGreaterThan(50);
		expect(specPages.length).toBeGreaterThan(20);

		// Expanded entity body is inlined on its detail page.
		const planSpecPage = site.pages.find((p) => p.route.url === '/specs/SPEC-071/');
		expect(planSpecPage).toBeDefined();
		expect(planSpecPage!.source?.type).toBe('contributed');
		const planSpecBlob = JSON.stringify(planSpecPage!.renderable);
		expect(planSpecBlob).toContain('Plan site scaffolding');

		// Pipeline composed cleanly — no error-severity warnings from the
		// contribute / aggregate / postProcess phases (entityRoutes + collection
		// + expand). Register-phase errors are author/data issues (e.g. a local
		// untracked duplicate-id file) and not what this test is proving.
		const errors = site.pipelineWarnings.filter(
			(w) => w.severity === 'error' && w.phase !== 'register',
		);
		expect(errors, errors.map((e) => `${e.phase}/${e.pluginName}: ${e.message}`).join('\n')).toEqual([]);
	}, 30_000);
});
