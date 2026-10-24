import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { scaffold, type ScaffoldTarget } from '../src/scaffold.js';

/**
 * BUG-035 / BUG-036 — every starter builds as scaffolded, with no errors.
 *
 * "Builds" is `createRefraktLoader` for every target: the loader each Vite
 * adapter's SSR and build path runs, and the content load the HTML and
 * Eleventy starters share. The HTML starter also runs its own `build.ts`,
 * since that script calls `loadContent` itself and is where BUG-036 lived.
 */

const root = join(
	tmpdir(),
	`create-refrakt-builds-${Date.now()}-${Math.random().toString(36).slice(2)}`,
);
afterAll(() => rmSync(root, { recursive: true, force: true }));

const TARGETS: ScaffoldTarget[] = ['sveltekit', 'html', 'astro', 'nuxt', 'next', 'eleventy'];

describe('scaffold: every starter builds with no errors', () => {
	it.each(TARGETS)('%s', async (target) => {
		const targetDir = join(root, target);
		await scaffold({
			projectName: `site-${target}`,
			targetDir,
			theme: '@refrakt-md/lumina',
			target,
		});

		const { createRefraktLoader } = await import('@refrakt-md/content');
		const loader = createRefraktLoader({
			configPath: join(targetDir, 'refrakt.config.json'),
			reporter: () => {},
		});
		const site = await loader.getSite();

		expect(site.pages.map((p) => p.route.url).sort()).toEqual(['/', '/docs/getting-started']);
		expect(site.pipelineWarnings.filter((w) => w.severity === 'error')).toEqual([]);
		// The nav names a page that exists (BUG-035): it renders as a link to it.
		const nav = JSON.stringify(site.pages[0].layout.regions.get('nav'));
		expect(nav).toContain('/docs/getting-started');
	});
});

describe('scaffold: the HTML starter runs its configured plugins', () => {
	// Scaffolded inside the repository, so `build.ts` resolves `@refrakt-md/*`
	// from the workspace's node_modules as an installed project would.
	const targetDir = resolve(
		import.meta.dirname,
		`.tmp-html-build-${Date.now()}-${Math.random().toString(36).slice(2)}`,
	);
	afterAll(() => rmSync(targetDir, { recursive: true, force: true }));

	it('a plugin pipeline hook rewrites a page in the built HTML', async () => {
		await scaffold({
			projectName: 'site-html',
			targetDir,
			theme: '@refrakt-md/lumina',
			target: 'html',
		});

		// Storytelling registers `character` entities (Phase 2) and its
		// `postProcess` hook links a bold mention of one on another page.
		const configPath = join(targetDir, 'refrakt.config.json');
		const config = JSON.parse(readFileSync(configPath, 'utf-8'));
		config.sites.main.plugins = [...(config.sites.main.plugins ?? []), '@refrakt-md/storytelling'];
		writeFileSync(configPath, JSON.stringify(config, null, 2));
		writeFileSync(
			join(targetDir, 'content', 'veshra.md'),
			'---\ntitle: Veshra\n---\n\n{% character name="Veshra" role="antagonist" %}\n# Veshra\n\nA warden.\n{% /character %}\n',
		);
		writeFileSync(
			join(targetDir, 'content', 'story.md'),
			'---\ntitle: Story\n---\n\n# Story\n\nThe gate was held by **Veshra**.\n',
		);

		// Strip the starter's types with esbuild (a starter devDependency), so
		// the script runs on any supported Node without tsx.
		const esbuild = await import('esbuild');
		await esbuild.build({
			entryPoints: [join(targetDir, 'build.ts')],
			outfile: join(targetDir, 'build.mjs'),
			format: 'esm',
			platform: 'node',
			logLevel: 'silent',
		});
		const stderr = runBuild(targetDir);

		const html = readFileSync(join(targetDir, 'build', 'story', 'index.html'), 'utf-8');
		expect(html).toMatch(/<a href="\/veshra"><strong[^>]*>Veshra<\/strong><\/a>/);
		expect(readdirSync(join(targetDir, 'build'))).toContain('client.js');
		expect(stderr).not.toMatch(/\berror\b/i);
	}, 60_000);
});

/** Run the starter's build and return what it wrote to stderr. */
function runBuild(cwd: string): string {
	const result = spawnSync(process.execPath, ['build.mjs'], { cwd, encoding: 'utf-8' });
	if (result.status !== 0) {
		throw new Error(`build.ts failed:\n${result.stdout}\n${result.stderr}`);
	}
	return result.stderr;
}
