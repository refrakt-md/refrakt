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
		expect(result.ssr.noExternal).toContain('@refrakt-md/lumina/svelte');

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

		expect((plugin.load as Function)('\0virtual:refrakt/theme'))
			.toBe("export { theme } from '@refrakt-md/lumina/svelte';");

		rmSync(dir, { recursive: true });
	});
});
