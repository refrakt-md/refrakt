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
	it('creates target directory with all expected files', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina' });

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

		// Starter content
		expect(existsSync(join(targetDir, 'content', '_layout.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'content', 'index.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'content', 'docs', 'getting-started.md'))).toBe(true);

		// Dotfile originals should be renamed (not exist)
		expect(existsSync(join(targetDir, '_gitignore'))).toBe(false);
		expect(existsSync(join(targetDir, '_npmrc'))).toBe(false);
	});

	it('generates package.json with correct project name and theme', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffold({ projectName: 'test-project', targetDir, theme: '@refrakt-md/lumina' });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.name).toBe('test-project');
		expect(pkg.type).toBe('module');
		expect(pkg.scripts.dev).toBe('vite dev');
		expect(pkg.dependencies['@refrakt-md/content']).toBeDefined();
		expect(pkg.dependencies['@refrakt-md/sveltekit']).toBeDefined();
		expect(pkg.dependencies['@refrakt-md/lumina']).toBeDefined();
		expect(pkg.devDependencies.svelte).toBeDefined();
	});

	it('generates refrakt.config.json with specified theme', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffold({ projectName: 'my-site', targetDir, theme: '@my-org/theme-custom' });

		const config = JSON.parse(readFileSync(join(targetDir, 'refrakt.config.json'), 'utf-8'));
		expect(config.theme).toBe('@my-org/theme-custom');
		expect(config.contentDir).toBe('./content');
		expect(config.target).toBe('sveltekit');
	});

	it('adds custom theme to package.json dependencies', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffold({ projectName: 'my-site', targetDir, theme: '@my-org/theme-custom' });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.dependencies['@my-org/theme-custom']).toBeDefined();
	});

	it('throws when target directory already exists', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina' });

		expect(() =>
			scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina' })
		).toThrow('already exists');
	});

	it('generates README with project name', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffold({ projectName: 'cool-docs', targetDir, theme: '@refrakt-md/lumina' });

		const readme = readFileSync(join(targetDir, 'README.md'), 'utf-8');
		expect(readme).toContain('# cool-docs');
	});

	it('template files have correct content', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina' });

		const viteConfig = readFileSync(join(targetDir, 'vite.config.ts'), 'utf-8');
		expect(viteConfig).toContain('refrakt()');
		expect(viteConfig).toContain('sveltekit()');

		const appDts = readFileSync(join(targetDir, 'src', 'app.d.ts'), 'utf-8');
		expect(appDts).toContain('@refrakt-md/sveltekit/virtual');

		const layout = readFileSync(join(targetDir, 'src', 'routes', '+layout.svelte'), 'utf-8');
		expect(layout).toContain('virtual:refrakt/tokens');

		const page = readFileSync(join(targetDir, 'src', 'routes', '[...slug]', '+page.svelte'), 'utf-8');
		expect(page).toContain('virtual:refrakt/theme');
	});
});
