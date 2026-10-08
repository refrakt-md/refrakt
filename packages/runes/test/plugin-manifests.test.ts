import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// SPEC-153 implementation note 1 (WORK-626): every plugin package must be readable as a
// package — its manifest resolvable by name, and everything its `files` declares present —
// because delivery mechanisms that read from the installed package rest on both. All of
// these failures are invisible in the monorepo, so they are asserted rather than assumed.
//
// The plugin list is read from `plugins/`, not named, so a new plugin is covered on arrival.
// `files` entries are checked after a build: `dist` is a build output.

const pluginsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../plugins');
const plugins = readdirSync(pluginsDir, { withFileTypes: true })
	.filter(
		(entry) => entry.isDirectory() && existsSync(join(pluginsDir, entry.name, 'package.json')),
	)
	.map((entry) => {
		const dir = join(pluginsDir, entry.name);
		const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
		return { dir, manifest };
	});

const require = createRequire(import.meta.url);

describe('plugin package manifests', () => {
	it('finds the plugin packages', () => {
		expect(plugins.length).toBeGreaterThan(0);
	});

	describe.each(plugins.map((p) => [p.manifest.name as string, p] as const))(
		'%s',
		(name, plugin) => {
			it('resolves <pkg>/package.json by package name', () => {
				expect(require.resolve(`${name}/package.json`)).toBe(join(plugin.dir, 'package.json'));
			});

			it('lists ./package.json in its exports map, if it declares one', () => {
				const { exports } = plugin.manifest;
				if (exports === undefined) return;
				expect(exports).toHaveProperty(['./package.json']);
			});

			it('has every `files` entry on disk', () => {
				const files: string[] = plugin.manifest.files ?? [];
				const missing = files.filter((entry) => !existsSync(join(plugin.dir, entry)));
				expect(missing).toEqual([]);
			});
		},
	);
});
