import { describe, it, expect } from 'vitest';
import { loadRefraktConfig } from '../src/config.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function tmpDir(): string {
	const dir = join(tmpdir(), `refrakt-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	mkdirSync(dir, { recursive: true });
	return dir;
}

describe('loadRefraktConfig', () => {
	it('loads a valid config file', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refrakt-md/lumina',
			target: 'sveltekit',
		}));

		const config = loadRefraktConfig(configPath);
		expect(config).toEqual({
			contentDir: './content',
			theme: '@refrakt-md/lumina',
			target: 'sveltekit',
		});

		rmSync(dir, { recursive: true });
	});

	it('throws when the file is missing', () => {
		expect(() => loadRefraktConfig('/nonexistent/refrakt.config.json'))
			.toThrow('refrakt.config.json not found');
	});

	it('throws on malformed JSON', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, '{ not valid json }');

		expect(() => loadRefraktConfig(configPath))
			.toThrow('Failed to parse refrakt.config.json');

		rmSync(dir, { recursive: true });
	});

	it('throws when contentDir is missing', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, JSON.stringify({
			theme: '@refrakt-md/lumina',
			target: 'sveltekit',
		}));

		expect(() => loadRefraktConfig(configPath))
			.toThrow('"contentDir" is required');

		rmSync(dir, { recursive: true });
	});

	it('throws when theme is missing', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			target: 'sveltekit',
		}));

		expect(() => loadRefraktConfig(configPath))
			.toThrow('"theme" is required');

		rmSync(dir, { recursive: true });
	});

	it('throws when target is missing', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refrakt-md/lumina',
		}));

		expect(() => loadRefraktConfig(configPath))
			.toThrow('"target" is required');

		rmSync(dir, { recursive: true });
	});

	it('loads config with routeRules', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		const rules = [
			{ pattern: 'docs/**', layout: 'docs' },
			{ pattern: '**', layout: 'default' },
		];
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refrakt-md/lumina',
			target: 'sveltekit',
			routeRules: rules,
		}));

		const config = loadRefraktConfig(configPath);
		expect(config.routeRules).toEqual(rules);

		rmSync(dir, { recursive: true });
	});

	it('throws when routeRules is not an array', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refrakt-md/lumina',
			target: 'sveltekit',
			routeRules: 'not-an-array',
		}));

		expect(() => loadRefraktConfig(configPath))
			.toThrow('"routeRules" must be an array');

		rmSync(dir, { recursive: true });
	});

	it('throws when routeRules entry is missing pattern', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refrakt-md/lumina',
			target: 'sveltekit',
			routeRules: [{ layout: 'default' }],
		}));

		expect(() => loadRefraktConfig(configPath))
			.toThrow('routeRules[0].pattern is required');

		rmSync(dir, { recursive: true });
	});

	it('ignores extra fields', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refrakt-md/lumina',
			target: 'sveltekit',
			extra: 'field',
		}));

		const config = loadRefraktConfig(configPath);
		expect(config).toEqual({
			contentDir: './content',
			theme: '@refrakt-md/lumina',
			target: 'sveltekit',
		});

		rmSync(dir, { recursive: true });
	});
});
