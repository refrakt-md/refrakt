import { describe, it, expect } from 'vitest';
import { refrakt } from '../src/plugin.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function tmpDir(): string {
	const dir = join(tmpdir(), `refrakt-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	mkdirSync(dir, { recursive: true });
	return dir;
}

describe('refrakt plugin', () => {
	it('returns a plugin with the correct name', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refrakt-md/lumina',
			target: 'svelte',
		}));

		const plugin = refrakt({ configPath });
		expect(plugin.name).toBe('refrakt-md');

		rmSync(dir, { recursive: true });
	});

	it('has the required hooks', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refrakt-md/lumina',
			target: 'svelte',
		}));

		const plugin = refrakt({ configPath });
		expect(typeof plugin.config).toBe('function');
		expect(typeof plugin.resolveId).toBe('function');
		expect(typeof plugin.load).toBe('function');
		expect(typeof plugin.configureServer).toBe('function');

		rmSync(dir, { recursive: true });
	});

	it('config hook returns correct ssr.noExternal', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refrakt-md/lumina',
			target: 'svelte',
		}));

		const plugin = refrakt({ configPath });
		const result = (plugin.config as Function)({}, { command: 'serve' }) as any;

		expect(result.ssr.noExternal).toContain('@markdoc/markdoc');
		expect(result.ssr.noExternal).toContain('@refrakt-md/runes');
		expect(result.ssr.noExternal).toContain('@refrakt-md/content');
		expect(result.ssr.noExternal).toContain('@refrakt-md/types');
		expect(result.ssr.noExternal).toContain('@refrakt-md/svelte');
		expect(result.ssr.noExternal).toContain('@refrakt-md/lumina');
		// ADR-009: no per-framework adapter path in noExternal
		expect(result.ssr.noExternal).not.toContain('@refrakt-md/lumina/svelte');

		rmSync(dir, { recursive: true });
	});

	it('config hook includes additional noExternal from options', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refrakt-md/lumina',
			target: 'svelte',
		}));

		const plugin = refrakt({ configPath, noExternal: ['custom-package'] });
		const result = (plugin.config as Function)({}, { command: 'serve' }) as any;

		expect(result.ssr.noExternal).toContain('custom-package');

		rmSync(dir, { recursive: true });
	});

	it('resolveId hook resolves virtual modules', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refrakt-md/lumina',
			target: 'svelte',
		}));

		const plugin = refrakt({ configPath });
		// Call config first to load the config
		(plugin.config as Function)({}, { command: 'serve' });

		expect((plugin.resolveId as Function)('virtual:refrakt/theme'))
			.toBe('\0virtual:refrakt/theme');
		expect((plugin.resolveId as Function)('svelte'))
			.toBeUndefined();

		rmSync(dir, { recursive: true });
	});

	it('load hook generates virtual module content', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refrakt-md/lumina',
			target: 'svelte',
		}));

		const plugin = refrakt({ configPath });
		// Call config first to load the config
		(plugin.config as Function)({}, { command: 'serve' });

		const result = (plugin.load as Function)('\0virtual:refrakt/theme');
		expect(result).toContain("import _manifest from '@refrakt-md/lumina/manifest'");
		expect(result).toContain("import { layouts as _layouts } from '@refrakt-md/lumina/layouts'");
		expect(result).toContain('routeRules:');
		expect(result).toContain('export const theme');

		rmSync(dir, { recursive: true });
	});

	it('uses the singular `site` shape and resolves to default', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, JSON.stringify({
			site: {
				contentDir: './content',
				theme: '@refrakt-md/lumina',
				target: 'svelte',
			},
		}));

		const plugin = refrakt({ configPath });
		(plugin.config as Function)({}, { command: 'serve' });

		const result = (plugin.load as Function)('\0virtual:refrakt/theme');
		expect(result).toContain("import _manifest from '@refrakt-md/lumina/manifest'");

		rmSync(dir, { recursive: true });
	});

	it('selects a named site from a multi-site config when site option is given', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, JSON.stringify({
			sites: {
				main: { contentDir: './content', theme: '@refrakt-md/lumina', target: 'svelte' },
				blog: { contentDir: './blog', theme: '@refrakt-md/lumina', target: 'svelte' },
			},
		}));

		const plugin = refrakt({ configPath, site: 'blog' });
		// Should not throw despite multiple sites
		expect(() => (plugin.config as Function)({}, { command: 'serve' })).not.toThrow();

		rmSync(dir, { recursive: true });
	});

	it('throws when a multi-site config is loaded without a site option', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, JSON.stringify({
			sites: {
				main: { contentDir: './content', theme: '@refrakt-md/lumina', target: 'svelte' },
				blog: { contentDir: './blog', theme: '@refrakt-md/lumina', target: 'svelte' },
			},
		}));

		const plugin = refrakt({ configPath });
		expect(() => (plugin.config as Function)({}, { command: 'serve' }))
			.toThrow(/multiple sites/);

		rmSync(dir, { recursive: true });
	});

	it('throws with did-you-mean when site name is unknown', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, JSON.stringify({
			sites: {
				main: { contentDir: './content', theme: '@refrakt-md/lumina', target: 'svelte' },
			},
		}));

		const plugin = refrakt({ configPath, site: 'maim' });
		expect(() => (plugin.config as Function)({}, { command: 'serve' }))
			.toThrow(/Did you mean "main"/);

		rmSync(dir, { recursive: true });
	});
});
