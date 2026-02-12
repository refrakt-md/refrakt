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
			theme: '@refrakt-md/theme-lumina',
			target: 'sveltekit',
		}));

		const config = loadRefraktConfig(configPath);
		expect(config).toEqual({
			contentDir: './content',
			theme: '@refrakt-md/theme-lumina',
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
			theme: '@refrakt-md/theme-lumina',
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
			theme: '@refrakt-md/theme-lumina',
		}));

		expect(() => loadRefraktConfig(configPath))
			.toThrow('"target" is required');

		rmSync(dir, { recursive: true });
	});

	it('ignores extra fields', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refrakt.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refrakt-md/theme-lumina',
			target: 'sveltekit',
			extra: 'field',
		}));

		const config = loadRefraktConfig(configPath);
		expect(config).toEqual({
			contentDir: './content',
			theme: '@refrakt-md/theme-lumina',
			target: 'sveltekit',
		});

		rmSync(dir, { recursive: true });
	});
});
