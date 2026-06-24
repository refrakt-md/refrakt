import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { loadPreset, loadPresets } from '../src/preset-loader.js';

const fixturesDir = dirname(fileURLToPath(import.meta.url));

describe('loadPreset', () => {
	it('loads a preset via default export', async () => {
		const config = await loadPreset('./fixtures/preset-with-default.mjs', { from: fixturesDir });
		expect(config.color?.primary).toBe('#7c3aed');
		expect(config.color?.text).toBe('#1c1a17');
		expect(config.modes?.dark?.color?.primary).toBe('#a78bfa');
	});

	it('loads a preset via named `config` export', async () => {
		const config = await loadPreset('./fixtures/preset-with-named-config.mjs', { from: fixturesDir });
		expect(config.syntax?.keyword).toBe('#2d5230');
		expect(config.syntax?.function).toBe('#b35070');
	});

	it('throws a clear error when the preset has no default or named config export', async () => {
		await expect(
			loadPreset('./fixtures/preset-without-export.mjs', { from: fixturesDir }),
		).rejects.toThrow(/has no default or named 'config' export/);
	});

	it('loads a declarative JSON preset (SPEC-111 §6)', async () => {
		const config = await loadPreset('./fixtures/preset-syntax.json', { from: fixturesDir });
		expect(config.syntax?.keyword).toBe('#2d5230');
		expect(config.color?.primary).toBe('#7c3aed');
	});

	it('rejects a JSON preset that is not an object', async () => {
		await expect(
			loadPreset('./fixtures/preset-not-object.json', { from: fixturesDir }),
		).rejects.toThrow(/not a ThemeTokensConfig object/);
	});

	it('throws a clear error when the specifier does not resolve', async () => {
		await expect(
			loadPreset('@refrakt-md/no-such-preset', { from: fixturesDir }),
		).rejects.toThrow(/not found/);
	});

	it('throws a clear error when a relative path does not exist', async () => {
		await expect(
			loadPreset('./fixtures/does-not-exist.mjs', { from: fixturesDir }),
		).rejects.toThrow(/failed to load preset/);
	});
});

describe('loadPresets', () => {
	it('loads multiple presets in declared order', async () => {
		const configs = await loadPresets(
			['./fixtures/preset-with-default.mjs', './fixtures/preset-with-named-config.mjs'],
			{ from: fixturesDir },
		);
		expect(configs).toHaveLength(2);
		expect(configs[0].color?.primary).toBe('#7c3aed');
		expect(configs[1].syntax?.keyword).toBe('#2d5230');
	});

	it('returns an empty array given no specifiers', async () => {
		const configs = await loadPresets([], { from: fixturesDir });
		expect(configs).toEqual([]);
	});
});
