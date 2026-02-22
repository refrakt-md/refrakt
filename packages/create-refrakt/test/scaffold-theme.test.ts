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

describe('scaffoldTheme', () => {
	it('creates all expected files', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		expect(existsSync(join(targetDir, 'package.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'src', 'config.ts'))).toBe(true);
		expect(existsSync(join(targetDir, 'svelte', 'index.ts'))).toBe(true);
		expect(existsSync(join(targetDir, 'manifest.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'index.css'))).toBe(true);
		expect(existsSync(join(targetDir, 'tokens', 'base.css'))).toBe(true);
		expect(existsSync(join(targetDir, 'tokens', 'dark.css'))).toBe(true);
		expect(existsSync(join(targetDir, 'styles', 'global.css'))).toBe(true);
		expect(existsSync(join(targetDir, 'tsconfig.json'))).toBe(true);
		expect(existsSync(join(targetDir, 'svelte', 'layouts', 'DefaultLayout.svelte'))).toBe(true);
		expect(existsSync(join(targetDir, 'test', 'css-coverage.test.ts'))).toBe(true);
		expect(existsSync(join(targetDir, 'preview', 'kitchen-sink.md'))).toBe(true);
		expect(existsSync(join(targetDir, 'base.css'))).toBe(true);
		expect(existsSync(join(targetDir, 'svelte', 'tokens.css'))).toBe(true);
	});

	it('generates package.json with correct exports and dependencies', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.name).toBe('my-theme');
		expect(pkg.type).toBe('module');
		expect(pkg.exports['.']).toBe('./index.css');
		expect(pkg.exports['./transform']).toBeDefined();
		expect(pkg.exports['./svelte']).toBeDefined();
		expect(pkg.exports['./manifest']).toBe('./manifest.json');
		expect(pkg.dependencies['@refrakt-md/theme-base']).toBeDefined();
		expect(pkg.dependencies['@refrakt-md/transform']).toBeDefined();
		expect(pkg.dependencies['@refrakt-md/types']).toBeDefined();
		expect(pkg.scripts.build).toBe('tsc');
	});

	it('generates config.ts with mergeThemeConfig and baseConfig', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const config = readFileSync(join(targetDir, 'src', 'config.ts'), 'utf-8');
		expect(config).toContain("import { baseConfig, mergeThemeConfig } from '@refrakt-md/theme-base'");
		expect(config).toContain('mergeThemeConfig(baseConfig,');
		expect(config).toContain('icons:');
		expect(config).toContain('runes:');
	});

	it('generates svelte/index.ts with full SvelteTheme object', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const svelteIndex = readFileSync(join(targetDir, 'svelte', 'index.ts'), 'utf-8');
		expect(svelteIndex).toContain("import type { SvelteTheme } from '@refrakt-md/svelte'");
		expect(svelteIndex).toContain('export const theme: SvelteTheme');
		expect(svelteIndex).toContain('layouts: { default: DefaultLayout }');
		expect(svelteIndex).toContain('components: registry');
		expect(svelteIndex).toContain("@refrakt-md/theme-base/svelte/registry");
		expect(svelteIndex).toContain("@refrakt-md/theme-base/svelte/elements");
	});

	it('generates manifest.json with correct structure', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const manifest = JSON.parse(readFileSync(join(targetDir, 'manifest.json'), 'utf-8'));
		expect(manifest.name).toBe('my-theme');
		expect(manifest.target).toBe('svelte');
		expect(manifest.layouts.default).toBeDefined();
		expect(manifest.routeRules).toHaveLength(1);
		expect(manifest.routeRules[0].pattern).toBe('**');
	});

	it('prepends scope to package name when --scope is provided', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir, scope: '@my-org' });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.name).toBe('@my-org/my-theme');

		const manifest = JSON.parse(readFileSync(join(targetDir, 'manifest.json'), 'utf-8'));
		expect(manifest.name).toBe('@my-org/my-theme');
	});

	it('throws when target directory already exists', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		expect(() =>
			scaffoldTheme({ themeName: 'my-theme', targetDir })
		).toThrow('already exists');
	});

	it('generates token files with design token variables', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const baseTokens = readFileSync(join(targetDir, 'tokens', 'base.css'), 'utf-8');
		expect(baseTokens).toContain('--rf-font-sans');
		expect(baseTokens).toContain('--rf-color-primary');
		expect(baseTokens).toContain('--rf-radius-md');
		expect(baseTokens).toContain('--rf-shadow-md');

		const darkTokens = readFileSync(join(targetDir, 'tokens', 'dark.css'), 'utf-8');
		expect(darkTokens).toContain('[data-theme="dark"]');
		expect(darkTokens).toContain('prefers-color-scheme: dark');
	});

	it('generates index.css importing tokens and global styles', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const indexCss = readFileSync(join(targetDir, 'index.css'), 'utf-8');
		expect(indexCss).toContain("'./tokens/base.css'");
		expect(indexCss).toContain("'./tokens/dark.css'");
		expect(indexCss).toContain("'./styles/global.css'");
	});

	it('creates styles/runes directory for future CSS stubs', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		expect(existsSync(join(targetDir, 'styles', 'runes'))).toBe(true);
	});

	it('generates svelte/index.ts with behaviors export', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const svelteIndex = readFileSync(join(targetDir, 'svelte', 'index.ts'), 'utf-8');
		expect(svelteIndex).toContain("@refrakt-md/theme-base/svelte/behaviors");
		expect(svelteIndex).toContain("behaviors");
	});

	it('generates DefaultLayout.svelte with Renderer', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const layout = readFileSync(join(targetDir, 'svelte', 'layouts', 'DefaultLayout.svelte'), 'utf-8');
		expect(layout).toContain("import { Renderer } from '@refrakt-md/svelte'");
		expect(layout).toContain('<Renderer node={renderable}');
		expect(layout).toContain('regions.header');
	});

	it('generates manifest.json with correct layout path', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const manifest = JSON.parse(readFileSync(join(targetDir, 'manifest.json'), 'utf-8'));
		expect(manifest.layouts.default.component).toBe('./svelte/layouts/DefaultLayout.svelte');
	});

	it('generates package.json with test script and devDependencies', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.scripts.test).toBe('vitest run');
		expect(pkg.devDependencies.vitest).toBeDefined();
		expect(pkg.devDependencies.postcss).toBeDefined();
	});

	it('generates css-coverage test that imports themeConfig', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const testFile = readFileSync(join(targetDir, 'test', 'css-coverage.test.ts'), 'utf-8');
		expect(testFile).toContain("import { themeConfig }");
		expect(testFile).toContain('postcss');
		expect(testFile).toContain('.rf-');
	});

	it('generates kitchen-sink.md with multiple rune types', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const kitchenSink = readFileSync(join(targetDir, 'preview', 'kitchen-sink.md'), 'utf-8');
		expect(kitchenSink).toContain('{% hint');
		expect(kitchenSink).toContain('{% grid');
		expect(kitchenSink).toContain('{% accordion %}');
		expect(kitchenSink).toContain('{% steps %}');
		expect(kitchenSink).toContain('{% api');
		expect(kitchenSink).toContain('{% tabs %}');
	});

	it('generates base.css with tokens and globals only', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const baseCss = readFileSync(join(targetDir, 'base.css'), 'utf-8');
		expect(baseCss).toContain("'./tokens/base.css'");
		expect(baseCss).toContain("'./tokens/dark.css'");
		expect(baseCss).toContain("'./styles/global.css'");
		// base.css should NOT contain rune CSS imports
		expect(baseCss).not.toContain('runes');
	});

	it('generates svelte/tokens.css bridge file', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const tokensCss = readFileSync(join(targetDir, 'svelte', 'tokens.css'), 'utf-8');
		expect(tokensCss).toContain("'../index.css'");
	});

	it('generates package.json with CSS exports for plugin integration', () => {
		const targetDir = tmpTarget();
		cleanupDirs.push(join(targetDir, '..'));

		scaffoldTheme({ themeName: 'my-theme', targetDir });

		const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
		expect(pkg.exports['./base.css']).toBe('./base.css');
		expect(pkg.exports['./styles/runes/*.css']).toBe('./styles/runes/*.css');
		expect(pkg.exports['./svelte/tokens.css']).toBe('./svelte/tokens.css');
		expect(pkg.files).toContain('base.css');
	});
});
