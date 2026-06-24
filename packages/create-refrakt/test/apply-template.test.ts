import { describe, it, expect, afterEach } from 'vitest';
import { applyTemplate, resolveTemplateDir } from '../src/scaffold.js';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const cleanup: string[] = [];
afterEach(() => { for (const d of cleanup) rmSync(d, { recursive: true, force: true }); cleanup.length = 0; });

/** Simulate a freshly-run framework scaffolder: stub content + a config with the
 *  singular `sites: { main }` shape + a package.json. */
function fakeScaffoldedProject(): string {
	const dir = join(tmpdir(), `cr-tmpl-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	cleanup.push(dir);
	mkdirSync(join(dir, 'content', 'docs'), { recursive: true });
	writeFileSync(join(dir, 'content', 'index.md'), '# stub\n');
	writeFileSync(join(dir, 'content', 'docs', 'getting-started.md'), '# stub\n');
	writeFileSync(join(dir, 'refrakt.config.json'), JSON.stringify({
		sites: { main: { contentDir: './content', theme: '@refrakt-md/lumina', target: 'html', plugins: ['@refrakt-md/marketing'], routeRules: [{ pattern: '**', layout: 'default' }] } },
	}, null, '\t'));
	writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', dependencies: { '@refrakt-md/lumina': '~0.24.6' } }, null, '\t'));
	return dir;
}

describe('resolveTemplateDir', () => {
	it('resolves the bundled docs-starter', () => {
		const dir = resolveTemplateDir('docs-starter');
		expect(existsSync(join(dir, 'template.json'))).toBe(true);
	});
	it('throws on an unknown template', () => {
		expect(() => resolveTemplateDir('no-such-template')).toThrow(/not found/);
	});
});

describe('reference template (docs-starter) dogfoods the manifest', () => {
	const dir = resolveTemplateDir('docs-starter');
	const manifest = JSON.parse(readFileSync(join(dir, 'template.json'), 'utf-8'));
	it('is kind:site with a site config and no install-derived path fields', () => {
		expect(manifest.kind).toBe('site');
		expect(manifest.site).toBeTruthy();
		expect(manifest.site.contentDir).toBeUndefined();
		expect(manifest.site.sandbox).toBeUndefined();
		expect(manifest.refrakt).toBeTruthy();
	});
	it('ships a content/ tree', () => {
		expect(existsSync(join(dir, 'content', 'index.md'))).toBe(true);
	});
});

describe('applyTemplate (SPEC-109 §2–§3)', () => {
	it('composes content + config + deps over the starter', () => {
		const target = fakeScaffoldedProject();
		applyTemplate({ targetDir: target, templateSource: 'docs-starter' });

		// Content replaced with the template's tree (concepts.md is template-only).
		expect(existsSync(join(target, 'content', 'docs', 'concepts.md'))).toBe(true);

		// Site config merged: template plugins/theme/routeRules win; contentDir kept.
		const cfg = JSON.parse(readFileSync(join(target, 'refrakt.config.json'), 'utf-8'));
		const site = cfg.sites.main;
		expect(site.plugins).toContain('@refrakt-md/docs');
		expect(site.routeRules[0].layout).toBe('docs');
		expect(site.theme.presets).toContain('@refrakt-md/lumina/presets/niwaki');
		expect(site.contentDir).toBe('./content'); // install-derived destination, unchanged

		// Derived deps pinned: the docs plugin is added.
		const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf-8'));
		expect(pkg.dependencies['@refrakt-md/docs']).toBeTruthy();
	});

	it('seeds assets + backgrounds and copies a bundled sandbox (WORK-454)', () => {
		const target = fakeScaffoldedProject();
		const tpl = join(target, '..', `tpl-asset-${Math.random().toString(36).slice(2)}`);
		cleanup.push(tpl);
		mkdirSync(join(tpl, 'content'), { recursive: true });
		mkdirSync(join(tpl, 'sandboxes', 'hero'), { recursive: true });
		writeFileSync(join(tpl, 'content', 'index.md'), '# t\n');
		writeFileSync(join(tpl, 'sandboxes', 'hero', 'index.js'), '// visualizer\n');
		writeFileSync(join(tpl, 'template.json'), JSON.stringify({
			kind: 'site',
			site: {
				assets: { baseUrl: '', shapes: {} },
				backgrounds: { 'midnight-waves': { framework: 'three' } },
			},
		}));
		applyTemplate({ targetDir: target, templateSource: tpl });

		const cfg = JSON.parse(readFileSync(join(target, 'refrakt.config.json'), 'utf-8'));
		const site = cfg.sites.main;
		expect(site.assets).toBeTruthy();
		expect(site.backgrounds['midnight-waves']).toBeTruthy();
		expect(site.sandbox.dir).toBe('./sandboxes');
		expect(existsSync(join(target, 'sandboxes', 'hero', 'index.js'))).toBe(true);
	});

	it('rejects a non-site kind', () => {
		const target = fakeScaffoldedProject();
		const fakeTpl = join(target, '..', `tpl-${Math.random().toString(36).slice(2)}`);
		cleanup.push(fakeTpl);
		mkdirSync(fakeTpl, { recursive: true });
		writeFileSync(join(fakeTpl, 'template.json'), JSON.stringify({ kind: 'section', site: {} }));
		expect(() => applyTemplate({ targetDir: target, templateSource: fakeTpl })).toThrow(/only "site" templates/);
	});
});
