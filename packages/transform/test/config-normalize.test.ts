import { describe, it, expect } from 'vitest';
import {
	normalizeRefraktConfig,
	resolveSite,
	resolvePlanConfig,
} from '../src/config-normalize.js';

describe('normalizeRefraktConfig', () => {
	describe('flat shape (legacy)', () => {
		it('collapses flat fields into sites.main', () => {
			const raw = {
				contentDir: './content',
				theme: '@refrakt-md/lumina',
				target: 'svelte',
				packages: ['@refrakt-md/marketing'],
			};
			const result = normalizeRefraktConfig(raw);
			expect(result.sites.main).toEqual({
				contentDir: './content',
				theme: '@refrakt-md/lumina',
				target: 'svelte',
				packages: ['@refrakt-md/marketing'],
			});
			expect(result.contentDir).toBe('./content');
			expect(result.theme).toBe('@refrakt-md/lumina');
		});

		it('preserves the legacy top-level fields for backwards compat', () => {
			const raw = {
				contentDir: './content',
				theme: '@refrakt-md/lumina',
				target: 'svelte',
				icons: { foo: '<svg/>' },
			};
			const result = normalizeRefraktConfig(raw);
			expect(result.contentDir).toBe('./content');
			expect(result.icons).toEqual({ foo: '<svg/>' });
		});
	});

	describe('singular site shape', () => {
		it('promotes site to sites.main', () => {
			const raw = {
				site: {
					contentDir: './content',
					theme: '@refrakt-md/lumina',
					target: 'svelte',
				},
			};
			const result = normalizeRefraktConfig(raw);
			expect(result.sites).toEqual({
				main: { contentDir: './content', theme: '@refrakt-md/lumina', target: 'svelte' },
			});
		});

		it('mirrors site fields to top level for adapter backwards compat', () => {
			const raw = {
				site: {
					contentDir: './content',
					theme: '@refrakt-md/lumina',
					target: 'svelte',
					packages: ['@refrakt-md/docs'],
				},
			};
			const result = normalizeRefraktConfig(raw);
			expect(result.contentDir).toBe('./content');
			expect(result.theme).toBe('@refrakt-md/lumina');
			expect(result.packages).toEqual(['@refrakt-md/docs']);
		});

		it('drops the canonical site key from the normalized output', () => {
			const raw = {
				site: { contentDir: './content', theme: 't', target: 'svelte' },
			};
			const result = normalizeRefraktConfig(raw) as Record<string, unknown>;
			expect(result.site).toBeUndefined();
		});
	});

	describe('plural sites shape', () => {
		it('preserves the sites map verbatim', () => {
			const raw = {
				sites: {
					main: { contentDir: './content', theme: 't', target: 'svelte' },
					blog: { contentDir: './blog', theme: 't', target: 'svelte' },
				},
			};
			const result = normalizeRefraktConfig(raw);
			expect(Object.keys(result.sites)).toEqual(['main', 'blog']);
			expect(result.sites.main!.contentDir).toBe('./content');
		});

		it('does not mirror to top level when there are multiple sites', () => {
			const raw = {
				sites: {
					main: { contentDir: './content', theme: 't', target: 'svelte' },
					blog: { contentDir: './blog', theme: 't', target: 'svelte' },
				},
			};
			const result = normalizeRefraktConfig(raw);
			expect(result.contentDir).toBeUndefined();
			expect(result.theme).toBeUndefined();
		});

		it('errors on an empty sites map', () => {
			expect(() => normalizeRefraktConfig({ sites: {} })).toThrow(/at least one site/);
		});
	});

	describe('plan-only shape', () => {
		it('accepts a config with only a plan section', () => {
			const result = normalizeRefraktConfig({ plan: { dir: 'plan' } });
			expect(result.plan).toEqual({ dir: 'plan' });
			expect(Object.keys(result.sites)).toEqual([]);
		});

		it('accepts an empty config', () => {
			const result = normalizeRefraktConfig({});
			expect(result.sites).toEqual({});
		});
	});

	describe('errors', () => {
		it('rejects both site and sites at the same time', () => {
			expect(() =>
				normalizeRefraktConfig({
					site: { contentDir: './content', theme: 't', target: 'svelte' },
					sites: { main: { contentDir: './content', theme: 't', target: 'svelte' } },
				}),
			).toThrow(/either "site" \(singular\) or "sites" \(plural map\)/);
		});

		it('rejects non-object input', () => {
			expect(() => normalizeRefraktConfig(null)).toThrow();
			expect(() => normalizeRefraktConfig('string')).toThrow();
			expect(() => normalizeRefraktConfig([])).toThrow();
		});
	});

	describe('path resolution (configDir option)', () => {
		const configDir = '/repo/root';

		it('absolutizes nested-shape contentDir against configDir', () => {
			const result = normalizeRefraktConfig(
				{ site: { contentDir: './content', theme: 't', target: 'svelte' } },
				{ configDir },
			);
			expect(result.sites.main!.contentDir).toBe('/repo/root/content');
			// Top-level mirror also reflects the absolutized path
			expect(result.contentDir).toBe('/repo/root/content');
		});

		it('absolutizes plural-shape paths per-site', () => {
			const result = normalizeRefraktConfig(
				{
					sites: {
						main: { contentDir: './site/content', theme: 't', target: 'svelte' },
						blog: { contentDir: '../blog/content', theme: 't', target: 'svelte' },
					},
				},
				{ configDir },
			);
			expect(result.sites.main!.contentDir).toBe('/repo/root/site/content');
			expect(result.sites.blog!.contentDir).toBe('/repo/blog/content');
		});

		it('leaves flat-shape paths as-is for legacy cwd-relative behavior', () => {
			const result = normalizeRefraktConfig(
				{ contentDir: './content', theme: 't', target: 'svelte' },
				{ configDir },
			);
			expect(result.sites.main!.contentDir).toBe('./content');
			expect(result.contentDir).toBe('./content');
		});

		it('passes through package names unchanged', () => {
			const result = normalizeRefraktConfig(
				{ site: { contentDir: './content', theme: '@refrakt-md/lumina', target: 'svelte' } },
				{ configDir },
			);
			expect(result.sites.main!.theme).toBe('@refrakt-md/lumina');
		});

		it('passes through absolute paths unchanged', () => {
			const result = normalizeRefraktConfig(
				{ site: { contentDir: '/abs/content', theme: 't', target: 'svelte' } },
				{ configDir },
			);
			expect(result.sites.main!.contentDir).toBe('/abs/content');
		});

		it('absolutizes sandbox.examplesDir, runes.local, and overrides values', () => {
			const result = normalizeRefraktConfig(
				{
					site: {
						contentDir: './content',
						theme: 't',
						target: 'svelte',
						sandbox: { examplesDir: './examples' },
						overrides: { Hero: './components/MyHero.svelte' },
						runes: { local: { 'my-rune': './runes/my-rune.ts' } },
					},
				},
				{ configDir },
			);
			expect(result.sites.main!.sandbox?.examplesDir).toBe('/repo/root/examples');
			expect(result.sites.main!.overrides?.Hero).toBe('/repo/root/components/MyHero.svelte');
			expect(result.sites.main!.runes?.local?.['my-rune']).toBe('/repo/root/runes/my-rune.ts');
		});

		it('skips path resolution entirely when configDir is omitted', () => {
			const result = normalizeRefraktConfig({
				site: { contentDir: './content', theme: 't', target: 'svelte' },
			});
			// Without configDir, paths stay as-is (existing tests cover this)
			expect(result.sites.main!.contentDir).toBe('./content');
		});
	});

	describe('plan + sites combined', () => {
		it('normalizes both sections together', () => {
			const result = normalizeRefraktConfig({
				plugins: ['@refrakt-md/plan'],
				plan: { dir: 'plan' },
				sites: {
					main: { contentDir: './content', theme: 't', target: 'svelte' },
				},
			});
			expect(result.plugins).toEqual(['@refrakt-md/plan']);
			expect(result.plan?.dir).toBe('plan');
			expect(result.sites.main!.contentDir).toBe('./content');
			// Single-site mirroring still applies even with plan present.
			expect(result.contentDir).toBe('./content');
		});
	});
});

describe('resolveSite', () => {
	const single = normalizeRefraktConfig({
		site: { contentDir: './content', theme: 't', target: 'svelte' },
	});
	const multi = normalizeRefraktConfig({
		sites: {
			main: { contentDir: './content', theme: 't', target: 'svelte' },
			blog: { contentDir: './blog', theme: 't', target: 'svelte' },
		},
	});
	const planOnly = normalizeRefraktConfig({ plan: { dir: 'plan' } });

	it('returns the only site when there is exactly one', () => {
		const { name, site } = resolveSite(single);
		expect(name).toBe('main');
		expect(site.contentDir).toBe('./content');
	});

	it('returns the named site for multi-site configs', () => {
		const { name, site } = resolveSite(multi, 'blog');
		expect(name).toBe('blog');
		expect(site.contentDir).toBe('./blog');
	});

	it('errors when a multi-site config is queried without a name', () => {
		expect(() => resolveSite(multi)).toThrow(/declares multiple sites/);
	});

	it('errors when an unknown site is requested with a did-you-mean', () => {
		expect(() => resolveSite(multi, 'maim')).toThrow(/Did you mean "main"/);
	});

	it('errors when no sites are declared at all', () => {
		expect(() => resolveSite(planOnly)).toThrow(/No site configured/);
	});
});

describe('resolvePlanConfig', () => {
	it('defaults dir to "plan"', () => {
		const result = resolvePlanConfig(normalizeRefraktConfig({}));
		expect(result.dir).toBe('plan');
	});

	it('respects an explicit plan.dir', () => {
		const result = resolvePlanConfig(normalizeRefraktConfig({ plan: { dir: 'project/plan' } }));
		expect(result.dir).toBe('project/plan');
	});
});
