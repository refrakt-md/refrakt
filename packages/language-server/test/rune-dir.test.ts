import 'reflect-metadata';
import { describe, it, expect, afterAll } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { getRune, initializeRegistry } from '../src/registry/loader.js';

/** SPEC-153 D2 — the editor's registry sees a plugin's `runeDir` runes too. */
describe('registry loader: a plugin runeDir', () => {
	const root = mkdtempSync(join(tmpdir(), 'refrakt-ls-rune-dir-'));
	afterAll(() => rmSync(root, { recursive: true, force: true }));

	it('indexes every `<rune>.md` in the declared directory', async () => {
		const pkg = join(root, 'node_modules', 'story-pack');
		mkdirSync(join(pkg, 'runes'), { recursive: true });
		writeFileSync(join(root, 'package.json'), '{"name":"ws","private":true}');
		writeFileSync(
			join(root, 'refrakt.config.json'),
			JSON.stringify({ contentDir: 'content', plugins: ['story-pack'] }),
		);
		writeFileSync(
			join(pkg, 'package.json'),
			JSON.stringify({ name: 'story-pack', version: '1.0.0', main: 'index.cjs' }),
		);
		writeFileSync(
			join(pkg, 'index.cjs'),
			"exports.story = { name: 'story', version: '1.0.0', runeDir: 'runes', runes: {} };\n",
		);
		writeFileSync(
			join(pkg, 'runes', 'bond.md'),
			readFileSync(
				resolve(__dirname, '../../content/test/fixtures/composed-storytelling/runes/bond.md'),
				'utf-8',
			),
		);

		await initializeRegistry(root);
		const bond = getRune('bond');
		expect(bond?.attributes.from).toBeDefined();
		expect(bond?.description).toMatch(/composed over `hint`/);
	});
});
