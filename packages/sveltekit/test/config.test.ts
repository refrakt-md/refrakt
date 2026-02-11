import { describe, it, expect } from 'vitest';
import { loadRefractConfig } from '../src/config.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function tmpDir(): string {
	const dir = join(tmpdir(), `refract-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	mkdirSync(dir, { recursive: true });
	return dir;
}

describe('loadRefractConfig', () => {
	it('loads a valid config file', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refract.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refract-md/theme-lumina',
			target: 'sveltekit',
		}));

		const config = loadRefractConfig(configPath);
		expect(config).toEqual({
			contentDir: './content',
			theme: '@refract-md/theme-lumina',
			target: 'sveltekit',
		});

		rmSync(dir, { recursive: true });
	});

	it('throws when the file is missing', () => {
		expect(() => loadRefractConfig('/nonexistent/refract.config.json'))
			.toThrow('refract.config.json not found');
	});

	it('throws on malformed JSON', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refract.config.json');
		writeFileSync(configPath, '{ not valid json }');

		expect(() => loadRefractConfig(configPath))
			.toThrow('Failed to parse refract.config.json');

		rmSync(dir, { recursive: true });
	});

	it('throws when contentDir is missing', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refract.config.json');
		writeFileSync(configPath, JSON.stringify({
			theme: '@refract-md/theme-lumina',
			target: 'sveltekit',
		}));

		expect(() => loadRefractConfig(configPath))
			.toThrow('"contentDir" is required');

		rmSync(dir, { recursive: true });
	});

	it('throws when theme is missing', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refract.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			target: 'sveltekit',
		}));

		expect(() => loadRefractConfig(configPath))
			.toThrow('"theme" is required');

		rmSync(dir, { recursive: true });
	});

	it('throws when target is missing', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refract.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refract-md/theme-lumina',
		}));

		expect(() => loadRefractConfig(configPath))
			.toThrow('"target" is required');

		rmSync(dir, { recursive: true });
	});

	it('ignores extra fields', () => {
		const dir = tmpDir();
		const configPath = join(dir, 'refract.config.json');
		writeFileSync(configPath, JSON.stringify({
			contentDir: './content',
			theme: '@refract-md/theme-lumina',
			target: 'sveltekit',
			extra: 'field',
		}));

		const config = loadRefractConfig(configPath);
		expect(config).toEqual({
			contentDir: './content',
			theme: '@refract-md/theme-lumina',
			target: 'sveltekit',
		});

		rmSync(dir, { recursive: true });
	});
});
