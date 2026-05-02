import { describe, it, expect, afterEach } from 'vitest';
import { scaffold } from '../src/scaffold.js';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function tmpTarget(): string {
	return join(
		tmpdir(),
		`create-refrakt-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		'my-site'
	);
}

const cleanupDirs: string[] = [];

afterEach(() => {
	for (const dir of cleanupDirs) {
		rmSync(dir, { recursive: true, force: true });
	}
	cleanupDirs.length = 0;
});

describe('scaffold', () => {
	it('creates target directory with all expected files', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina' });

		// Static template files
		expect(existsSync(join(targetDir, 'svelte.config.js'))).toBe(true);
		expect(existsSync(join(targetDir, 'vite.config.ts'))).toBe(true);
		expect(existsSync(join(targetDir, 'tsconfig.json'))).toBe(true);
		expect(existsSync(join(targetDir, '.gitignore'))).toBe(true);
		expect(existsSync(join(targetDir, '.npmrc'))).toBe(true);
		expect(existsSync(join(targetDir, 'src', 'app.d.ts'))).toBe(true);
		expect(existsSync(join(targetDir, 'src', 'app.html'))).toBe(true);
		expect(existsSync(join(targetDir, 'src', 'lib', 'index.ts'))).toBe(true);
		expect(existsSync(join(targetDir, 'src', 'routes', '+layout.svelte'))).toBe(true);
		expect(existsSync(join(targetDir, 'src', 'routes', '+layout.server.ts'))).toBe(true);
		expect(existsSync(join(targetDir, 'src', 'routes', '[...slug]', '+page.svelte'))).toBe(true);
		expect(existsSync(join(targetDir, 'src', 'routes', '[...slug]', '+page.server.ts'))).toBe(true);
		expect(existsSync(join(targetDir, 'static', 'robots.txt'))).toBe(true);

		// Generated files
		expect(existsSync(join(targetDir, 'package.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'refrakt.config.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'README.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'AGENTS.md'))).toBe(true);

		// Starter content
		expect(existsSync(join(targetDir, 'content', '_layout.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'content', 'index.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'content', 'docs', 'getting-started.md'))).toBe(true);

		// Dotfile originals should be renamed (not exist)
		expect(existsSync(join(targetDir, '_gitignore'))).toBe(false);
		expect(existsSync(join(targetDir, '_npmrc'))).toBe(false);
	});

	it('generates package.json with correct project name and theme', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'test-project', targetDir, theme: '@refrakt-md/lumina' });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.name).toBe('test-project');
		expect(pkg.type).toBe('module');
		expect(pkg.scripts.dev).toBe('vite dev');
		expect(pkg.dependencies['@refrakt-md/content']).toBeDefined();
		expect(pkg.dependencies['@refrakt-md/sveltekit']).toBeDefined();
		expect(pkg.dependencies['@refrakt-md/lumina']).toBeDefined();
		expect(pkg.devDependencies.svelte).toBeDefined();
	});

	it('generates refrakt.config.json with specified theme', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@my-org/theme-custom' });

		const config = JSON.parse(readFileSync(join(targetDir, 'refrakt.config.json'), 'utf-8'));
		// New unified shape: site config lives under sites.main
		expect(config.sites.main.theme).toBe('@my-org/theme-custom');
		expect(config.sites.main.contentDir).toBe('./content');
		expect(config.sites.main.target).toBe('svelte');
		expect(config.$schema).toBeDefined();
	});

	it('generates dependency versions matching the package version', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina' });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		const ownPkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
		const expected = `~${ownPkg.version}`;
		expect(pkg.dependencies['@refrakt-md/content']).toBe(expected);
		expect(pkg.dependencies['@refrakt-md/highlight']).toBe(expected);
		expect(pkg.dependencies['@refrakt-md/runes']).toBe(expected);
		expect(pkg.dependencies['@refrakt-md/svelte']).toBe(expected);
		expect(pkg.dependencies['@refrakt-md/sveltekit']).toBe(expected);
		expect(pkg.dependencies['@refrakt-md/types']).toBe(expected);
		expect(pkg.dependencies['@refrakt-md/lumina']).toBe(expected);
		// Third-party packages should not use the refrakt version
		expect(pkg.dependencies['@markdoc/markdoc']).toBe('^0.4.0');
	});

	it('adds custom theme to package.json dependencies', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@my-org/theme-custom' });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.dependencies['@my-org/theme-custom']).toBeDefined();
	});

	it('throws when target directory already exists', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina' });

		await expect(
			scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina' })
		).rejects.toThrow('already exists');
	});

	it('generates README with project name', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'cool-docs', targetDir, theme: '@refrakt-md/lumina' });

		const readme = readFileSync(join(targetDir, 'README.md'), 'utf-8');
		expect(readme).toContain('# cool-docs');
	});

	it('template files have correct content', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina' });

		const viteConfig = readFileSync(join(targetDir, 'vite.config.ts'), 'utf-8');
		expect(viteConfig).toContain("refrakt({ site: 'main' })");
		expect(viteConfig).toContain('sveltekit()');

		const appDts = readFileSync(join(targetDir, 'src', 'app.d.ts'), 'utf-8');
		expect(appDts).toContain('@refrakt-md/sveltekit/virtual');

		const layout = readFileSync(join(targetDir, 'src', 'routes', '+layout.svelte'), 'utf-8');
		expect(layout).toContain('virtual:refrakt/tokens');

		const page = readFileSync(join(targetDir, 'src', 'routes', '[...slug]', '+page.svelte'), 'utf-8');
		expect(page).toContain('virtual:refrakt/theme');
	});

	it('defaults to sveltekit target when target is not specified', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina' });

		// Should produce SvelteKit files
		expect(existsSync(join(targetDir, 'svelte.config.js'))).toBe(true);
		expect(existsSync(join(targetDir, 'src', 'routes', '+layout.svelte'))).toBe(true);

		const config = JSON.parse(readFileSync(join(targetDir, 'refrakt.config.json'), 'utf-8'));
		expect(config.sites.main.target).toBe('svelte');
	});

	it('generates AGENTS.md with rune reference', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina' });

		const agents = readFileSync(join(targetDir, 'AGENTS.md'), 'utf-8');
		expect(agents).toContain('refrakt reference dump');
		expect(agents).toContain('## Universal Attributes');
		// Core runes should be present
		expect(agents).toContain('### hint');
		// Marketing package rune should be present (default scaffolded package)
		expect(agents).toContain('### hero');
	});
});

describe('scaffold (html target)', () => {
	it('creates target directory with HTML template files', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina', target: 'html' });

		expect(existsSync(join(targetDir, 'build.ts'))).toBe(true);
		expect(existsSync(join(targetDir, 'tsconfig.json'))).toBe(true);
		expect(existsSync(join(targetDir, '.gitignore'))).toBe(true);
		expect(existsSync(join(targetDir, 'package.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'refrakt.config.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'README.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'AGENTS.md'))).toBe(true);

		// Starter content
		expect(existsSync(join(targetDir, 'content', '_layout.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'content', 'index.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'content', 'docs', 'getting-started.md'))).toBe(true);

		// Should NOT have SvelteKit files
		expect(existsSync(join(targetDir, 'svelte.config.js'))).toBe(false);
		expect(existsSync(join(targetDir, 'vite.config.ts'))).toBe(false);
		expect(existsSync(join(targetDir, 'src', 'routes'))).toBe(false);

		// Dotfile original should be renamed
		expect(existsSync(join(targetDir, '_gitignore'))).toBe(false);
	});

	it('generates package.json with HTML adapter dependencies', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina', target: 'html' });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.name).toBe('my-site');
		expect(pkg.type).toBe('module');
		expect(pkg.scripts.build).toBe('tsx build.ts');
		expect(pkg.scripts.serve).toBe('npx serve build');

		// HTML adapter deps
		expect(pkg.dependencies['@refrakt-md/html']).toBeDefined();
		expect(pkg.dependencies['@refrakt-md/content']).toBeDefined();
		expect(pkg.dependencies['@refrakt-md/transform']).toBeDefined();
		expect(pkg.dependencies['@refrakt-md/lumina']).toBeDefined();

		// Should NOT have SvelteKit deps
		expect(pkg.dependencies['@refrakt-md/svelte']).toBeUndefined();
		expect(pkg.dependencies['@refrakt-md/sveltekit']).toBeUndefined();
		expect(pkg.devDependencies?.svelte).toBeUndefined();
		expect(pkg.devDependencies?.['@sveltejs/kit']).toBeUndefined();
	});

	it('generates refrakt.config.json with html target', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina', target: 'html' });

		const config = JSON.parse(readFileSync(join(targetDir, 'refrakt.config.json'), 'utf-8'));
		expect(config.sites.main.target).toBe('html');
		expect(config.sites.main.theme).toBe('@refrakt-md/lumina');
		expect(config.sites.main.contentDir).toBe('./content');
	});

	it('generates dependency versions matching the package version', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina', target: 'html' });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		const ownPkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
		const expected = `~${ownPkg.version}`;
		expect(pkg.dependencies['@refrakt-md/content']).toBe(expected);
		expect(pkg.dependencies['@refrakt-md/html']).toBe(expected);
		expect(pkg.dependencies['@refrakt-md/runes']).toBe(expected);
		expect(pkg.dependencies['@refrakt-md/transform']).toBe(expected);
		expect(pkg.dependencies['@refrakt-md/lumina']).toBe(expected);
	});

	it('throws when target directory already exists', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina', target: 'html' });

		await expect(
			scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina', target: 'html' })
		).rejects.toThrow('already exists');
	});
});

describe('scaffold (astro target)', () => {
	it('creates target directory with Astro template files', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina', target: 'astro' });

		expect(existsSync(join(targetDir, 'astro.config.mjs'))).toBe(true);
		expect(existsSync(join(targetDir, 'tsconfig.json'))).toBe(true);
		expect(existsSync(join(targetDir, '.gitignore'))).toBe(true);
		expect(existsSync(join(targetDir, 'src', 'pages', '[...slug].astro'))).toBe(true);
		expect(existsSync(join(targetDir, 'package.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'refrakt.config.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'README.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'AGENTS.md'))).toBe(true);

		// Starter content
		expect(existsSync(join(targetDir, 'content', '_layout.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'content', 'index.md'))).toBe(true);

		// Should NOT have SvelteKit files
		expect(existsSync(join(targetDir, 'svelte.config.js'))).toBe(false);
		expect(existsSync(join(targetDir, '_gitignore'))).toBe(false);
	});

	it('generates package.json with Astro dependencies', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina', target: 'astro' });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.name).toBe('my-site');
		expect(pkg.scripts.dev).toBe('astro dev');
		expect(pkg.dependencies['@refrakt-md/astro']).toBeDefined();
		expect(pkg.dependencies['@refrakt-md/content']).toBeDefined();
		expect(pkg.dependencies.astro).toBeDefined();
		expect(pkg.dependencies['@refrakt-md/lumina']).toBeDefined();

		// Should NOT have SvelteKit deps
		expect(pkg.dependencies['@refrakt-md/sveltekit']).toBeUndefined();
		expect(pkg.dependencies['@refrakt-md/svelte']).toBeUndefined();
	});

	it('generates refrakt.config.json with astro target', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina', target: 'astro' });

		const config = JSON.parse(readFileSync(join(targetDir, 'refrakt.config.json'), 'utf-8'));
		expect(config.sites.main.target).toBe('astro');
		expect(config.sites.main.theme).toBe('@refrakt-md/lumina');
	});
});

describe('scaffold (nuxt target)', () => {
	it('creates target directory with Nuxt template files', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina', target: 'nuxt' });

		expect(existsSync(join(targetDir, 'nuxt.config.ts'))).toBe(true);
		expect(existsSync(join(targetDir, 'tsconfig.json'))).toBe(true);
		expect(existsSync(join(targetDir, '.gitignore'))).toBe(true);
		expect(existsSync(join(targetDir, 'pages', '[...slug].vue'))).toBe(true);
		expect(existsSync(join(targetDir, 'package.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'refrakt.config.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'README.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'AGENTS.md'))).toBe(true);

		// Starter content
		expect(existsSync(join(targetDir, 'content', '_layout.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'content', 'index.md'))).toBe(true);

		expect(existsSync(join(targetDir, '_gitignore'))).toBe(false);
	});

	it('generates package.json with Nuxt dependencies', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina', target: 'nuxt' });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.name).toBe('my-site');
		expect(pkg.scripts.dev).toBe('nuxt dev');
		expect(pkg.dependencies['@refrakt-md/nuxt']).toBeDefined();
		expect(pkg.dependencies['@refrakt-md/content']).toBeDefined();
		expect(pkg.devDependencies.nuxt).toBeDefined();
		expect(pkg.dependencies['@refrakt-md/lumina']).toBeDefined();

		expect(pkg.dependencies['@refrakt-md/sveltekit']).toBeUndefined();
	});

	it('generates refrakt.config.json with nuxt target', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina', target: 'nuxt' });

		const config = JSON.parse(readFileSync(join(targetDir, 'refrakt.config.json'), 'utf-8'));
		expect(config.sites.main.target).toBe('nuxt');
	});
});

describe('scaffold (next target)', () => {
	it('creates target directory with Next.js template files', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina', target: 'next' });

		expect(existsSync(join(targetDir, 'next.config.mjs'))).toBe(true);
		expect(existsSync(join(targetDir, 'tsconfig.json'))).toBe(true);
		expect(existsSync(join(targetDir, '.gitignore'))).toBe(true);
		expect(existsSync(join(targetDir, 'app', 'layout.tsx'))).toBe(true);
		expect(existsSync(join(targetDir, 'app', '[...slug]', 'page.tsx'))).toBe(true);
		expect(existsSync(join(targetDir, 'package.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'refrakt.config.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'README.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'AGENTS.md'))).toBe(true);

		// Starter content
		expect(existsSync(join(targetDir, 'content', '_layout.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'content', 'index.md'))).toBe(true);

		expect(existsSync(join(targetDir, '_gitignore'))).toBe(false);
	});

	it('generates package.json with Next.js dependencies', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina', target: 'next' });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.name).toBe('my-site');
		expect(pkg.scripts.dev).toBe('next dev');
		expect(pkg.dependencies['@refrakt-md/next']).toBeDefined();
		expect(pkg.dependencies['@refrakt-md/content']).toBeDefined();
		expect(pkg.dependencies.next).toBeDefined();
		expect(pkg.dependencies.react).toBeDefined();
		expect(pkg.dependencies['@refrakt-md/lumina']).toBeDefined();

		expect(pkg.dependencies['@refrakt-md/sveltekit']).toBeUndefined();
	});

	it('generates refrakt.config.json with next target', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina', target: 'next' });

		const config = JSON.parse(readFileSync(join(targetDir, 'refrakt.config.json'), 'utf-8'));
		expect(config.sites.main.target).toBe('next');
	});
});

describe('scaffold (eleventy target)', () => {
	it('creates target directory with Eleventy template files', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina', target: 'eleventy' });

		expect(existsSync(join(targetDir, 'eleventy.config.js'))).toBe(true);
		expect(existsSync(join(targetDir, '.gitignore'))).toBe(true);
		expect(existsSync(join(targetDir, 'src', '_data', 'refrakt.js'))).toBe(true);
		expect(existsSync(join(targetDir, 'src', '_includes', 'base.njk'))).toBe(true);
		expect(existsSync(join(targetDir, 'src', 'pages.njk'))).toBe(true);
		expect(existsSync(join(targetDir, 'package.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'refrakt.config.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'README.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'AGENTS.md'))).toBe(true);

		// Starter content
		expect(existsSync(join(targetDir, 'content', '_layout.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'content', 'index.md'))).toBe(true);

		expect(existsSync(join(targetDir, '_gitignore'))).toBe(false);
	});

	it('generates package.json with Eleventy dependencies', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina', target: 'eleventy' });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.name).toBe('my-site');
		expect(pkg.scripts.dev).toBe('eleventy --serve');
		expect(pkg.dependencies['@refrakt-md/eleventy']).toBeDefined();
		expect(pkg.dependencies['@refrakt-md/content']).toBeDefined();
		expect(pkg.devDependencies['@11ty/eleventy']).toBeDefined();
		expect(pkg.dependencies['@refrakt-md/lumina']).toBeDefined();

		expect(pkg.dependencies['@refrakt-md/sveltekit']).toBeUndefined();
	});

	it('generates refrakt.config.json with eleventy target', async () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina', target: 'eleventy' });

		const config = JSON.parse(readFileSync(join(targetDir, 'refrakt.config.json'), 'utf-8'));
		expect(config.sites.main.target).toBe('eleventy');
	});
});
