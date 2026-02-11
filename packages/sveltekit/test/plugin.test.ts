import { describe, it, expect } from 'vitest';
import { refract } from '../src/plugin.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function tmpDir(): string {
	const dir = join(tmpdir(), `refract-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	mkdirSync(dir, { recursive: true });
	return dir;
}

describe('refract plugin', () => {
	it('returns a plugin with the correct name', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refract.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refract-md/theme-lumina',
			target: 'sveltekit',
		}));

		const plugin = refract({ configPath });
		expect(plugin.name).toBe('refract-md');

		rmSync(dir, { recursive: true });
	});

	it('has the required hooks', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refract.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refract-md/theme-lumina',
			target: 'sveltekit',
		}));

		const plugin = refract({ configPath });
		expect(typeof plugin.config).toBe('function');
		expect(typeof plugin.resolveId).toBe('function');
		expect(typeof plugin.load).toBe('function');
		expect(typeof plugin.configureServer).toBe('function');

		rmSync(dir, { recursive: true });
	});

	it('config hook returns correct ssr.noExternal', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refract.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refract-md/theme-lumina',
			target: 'sveltekit',
		}));

		const plugin = refract({ configPath });
		const result = (plugin.config as Function)() as any;

		expect(result.ssr.noExternal).toContain('@markdoc/markdoc');
		expect(result.ssr.noExternal).toContain('@refract-md/runes');
		expect(result.ssr.noExternal).toContain('@refract-md/content');
		expect(result.ssr.noExternal).toContain('@refract-md/types');
		expect(result.ssr.noExternal).toContain('@refract-md/svelte');
		expect(result.ssr.noExternal).toContain('@refract-md/theme-lumina');

		rmSync(dir, { recursive: true });
	});

	it('config hook includes additional noExternal from options', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refract.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refract-md/theme-lumina',
			target: 'sveltekit',
		}));

		const plugin = refract({ configPath, noExternal: ['custom-package'] });
		const result = (plugin.config as Function)() as any;

		expect(result.ssr.noExternal).toContain('custom-package');

		rmSync(dir, { recursive: true });
	});

	it('resolveId hook resolves virtual modules', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refract.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refract-md/theme-lumina',
			target: 'sveltekit',
		}));

		const plugin = refract({ configPath });
		// Call config first to load the config
		(plugin.config as Function)();

		expect((plugin.resolveId as Function)('virtual:refract/theme'))
			.toBe('\0virtual:refract/theme');
		expect((plugin.resolveId as Function)('svelte'))
			.toBeUndefined();

		rmSync(dir, { recursive: true });
	});

	it('load hook generates virtual module content', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refract.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refract-md/theme-lumina',
			target: 'sveltekit',
		}));

		const plugin = refract({ configPath });
		// Call config first to load the config
		(plugin.config as Function)();

		expect((plugin.load as Function)('\0virtual:refract/theme'))
			.toBe("export { theme } from '@refract-md/theme-lumina';");

		rmSync(dir, { recursive: true });
	});
});
