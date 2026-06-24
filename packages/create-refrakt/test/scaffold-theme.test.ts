import { describe, it, expect, afterEach } from 'vitest';
import { scaffoldTheme } from '../src/scaffold.js';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function tmpTarget(): string {
	return join(
		tmpdir(),
		`create-refrakt-theme-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		'my-theme'
	);
}

const cleanupDirs: string[] = [];

afterEach(() => {
	for (const dir of cleanupDirs) {
		rmSync(dir, { recursive: true, force: true });
	}
	cleanupDirs.length = 0;
});

// ADR-024: `scaffoldTheme` defaults to a FRAMEWORK-AGNOSTIC theme (no svelte/,
// no target, peerDependencies). `--target svelte` opts into the component layer.

describe('scaffoldTheme (framework-agnostic default, ADR-024)', () => {
	it('creates the agnostic core files and NO svelte/ layer', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		expect(existsSync(join(targetDir, 'package.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'src', 'config.ts'))).toBe(true);
		expect(existsSync(join(targetDir, 'src', 'layouts.ts'))).toBe(true);
		expect(existsSync(join(targetDir, 'manifest.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'index.css'))).toBe(true);
		expect(existsSync(join(targetDir, 'tokens', 'base.css'))).toBe(true);
		expect(existsSync(join(targetDir, 'tokens', 'dark.css'))).toBe(true);
		expect(existsSync(join(targetDir, 'styles', 'global.css'))).toBe(true);
		expect(existsSync(join(targetDir, 'tsconfig.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'test', 'css-coverage.test.ts'))).toBe(true);
		expect(existsSync(join(targetDir, 'preview', 'kitchen-sink.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'base.css'))).toBe(true);
		// No framework layer by default.
		expect(existsSync(join(targetDir, 'svelte'))).toBe(false);
	});

	it('package.json: peerDeps (minor range), ./transform + ./layouts exports, no ./svelte', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.name).toBe('my-theme');
		expect(pkg.exports['.']).toBe('./index.css');
		expect(pkg.exports['./transform']).toBeDefined();
		expect(pkg.exports['./layouts']).toBeDefined();
		expect(pkg.exports['./manifest']).toBe('./manifest.json');
		expect(pkg.exports['./svelte']).toBeUndefined();
		// ADR-023: peerDependencies with a minor range, mirrored to devDependencies.
		expect(pkg.peerDependencies['@refrakt-md/runes']).toMatch(/^>=/);
		expect(pkg.peerDependencies['@refrakt-md/transform']).toBeDefined();
		expect(pkg.peerDependencies['@refrakt-md/types']).toBeDefined();
		expect(pkg.peerDependencies['@refrakt-md/svelte']).toBeUndefined();
		expect(pkg.devDependencies['@refrakt-md/runes']).toBeDefined();
		expect(pkg.dependencies).toBeUndefined();
		expect(pkg.scripts.build).toBe('tsc');
	});

	it('manifest.json: no target, a refrakt range, regions-only layouts', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const manifest = JSON.parse(readFileSync(join(targetDir, 'manifest.json'), 'utf-8'));
		expect(manifest.name).toBe('my-theme');
		expect(manifest.target).toBeUndefined();
		expect(manifest.refrakt).toMatch(/^>=/);
		expect(manifest.layouts.default.regions).toBeDefined();
		expect(manifest.layouts.default.component).toBeUndefined();
	});

	it('src/layouts.ts re-exports the built-in layout configs', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const layouts = readFileSync(join(targetDir, 'src', 'layouts.ts'), 'utf-8');
		expect(layouts).toContain("from '@refrakt-md/transform'");
		expect(layouts).toContain('defaultLayout');
		expect(layouts).toContain('export const layouts');
	});

	it('config.ts uses mergeThemeConfig + baseConfig', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const config = readFileSync(join(targetDir, 'src', 'config.ts'), 'utf-8');
		expect(config).toContain("import { baseConfig } from '@refrakt-md/runes'");
		expect(config).toContain('mergeThemeConfig(baseConfig,');
	});

	it('prepends scope to the package + manifest name', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir, scope: '@my-org' });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.name).toBe('@my-org/my-theme');
		const manifest = JSON.parse(readFileSync(join(targetDir, 'manifest.json'), 'utf-8'));
		expect(manifest.name).toBe('@my-org/my-theme');
	});

	it('throws when the target directory already exists', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });
		expect(() => scaffoldTheme({ themeName: 'my-theme', targetDir })).toThrow('already exists');
	});

	it('token files carry design-token variables + dark overlay', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const baseTokens = readFileSync(join(targetDir, 'tokens', 'base.css'), 'utf-8');
		expect(baseTokens).toContain('--rf-font-sans');
		expect(baseTokens).toContain('--rf-color-primary');
		const darkTokens = readFileSync(join(targetDir, 'tokens', 'dark.css'), 'utf-8');
		expect(darkTokens).toContain('[data-theme="dark"]');
		expect(darkTokens).toContain('prefers-color-scheme: dark');
	});

	it('css-coverage test imports themeConfig (no svelte dependency)', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const testFile = readFileSync(join(targetDir, 'test', 'css-coverage.test.ts'), 'utf-8');
		expect(testFile).toContain('import { themeConfig }');
		expect(testFile).toContain('.rf-');
		expect(testFile).not.toContain('@refrakt-md/svelte');
	});
});

describe('scaffoldTheme --target svelte (component layer opt-in)', () => {
	it('adds the svelte/ layer, ./svelte export, and svelte peer', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir, target: 'svelte' });

		expect(existsSync(join(targetDir, 'svelte', 'index.ts'))).toBe(true);
		expect(existsSync(join(targetDir, 'svelte', 'layouts', 'DefaultLayout.svelte'))).toBe(true);
		expect(existsSync(join(targetDir, 'svelte', 'tokens.css'))).toBe(true);

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.exports['./svelte']).toBeDefined();
		expect(pkg.exports['./svelte/tokens.css']).toBe('./svelte/tokens.css');
		expect(pkg.peerDependencies['@refrakt-md/svelte']).toBeDefined();
		expect(pkg.files).toContain('svelte');

		const svelteIndex = readFileSync(join(targetDir, 'svelte', 'index.ts'), 'utf-8');
		expect(svelteIndex).toContain("import type { SvelteTheme } from '@refrakt-md/svelte'");
		expect(svelteIndex).toContain('export const theme: SvelteTheme');
	});
});
