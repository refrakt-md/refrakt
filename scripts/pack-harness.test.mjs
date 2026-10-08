import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { internalClosure, isInside, readWorkspaces, selectPlugins } from './pack-harness.mjs';

const ROOT = resolve(import.meta.dirname, '..');

/**
 * The harness itself packs and installs, which takes ~25s and needs npm's cache,
 * so it runs as its own CI step (`validate.yml`) rather than inside vitest. These
 * tests cover the parts that decide what it installs and where.
 */
describe('pack harness', () => {
	const workspaces = readWorkspaces(ROOT);

	it('targets every plugin under plugins/ by default', () => {
		const plugins = selectPlugins([], workspaces);
		expect(plugins).toContain('@refrakt-md/plan');
		expect(plugins).toContain('@refrakt-md/marketing');
		expect(plugins.every((p) => workspaces.get(p).dir.startsWith(join(ROOT, 'plugins')))).toBe(
			true,
		);
	});

	it('accepts short and full plugin names, and rejects unknown ones', () => {
		expect(selectPlugins(['plan', '@refrakt-md/docs'], workspaces)).toEqual([
			'@refrakt-md/plan',
			'@refrakt-md/docs',
		]);
		expect(() => selectPlugins(['runes'], workspaces)).toThrow(/Unknown plugin/);
	});

	// Anything internal left out of the closure would be fetched from the registry,
	// testing the last release instead of this tree.
	it('packs the transitive internal dependencies, including runes', () => {
		const closure = internalClosure('@refrakt-md/plan', workspaces);
		expect(closure).toEqual(
			expect.arrayContaining([
				'@refrakt-md/plan',
				'@refrakt-md/runes',
				'@refrakt-md/content',
				'@refrakt-md/highlight',
				'@refrakt-md/transform',
				'@refrakt-md/types',
			]),
		);
		for (const name of closure) {
			const { dependencies = {}, peerDependencies = {} } = workspaces.get(name).pkg;
			for (const dep of Object.keys({ ...dependencies, ...peerDependencies })) {
				if (workspaces.has(dep)) expect(closure).toContain(dep);
			}
		}
	});

	it('places fixture projects outside the workspace', () => {
		expect(isInside(tmpdir(), ROOT)).toBe(false);
		expect(isInside(join(ROOT, 'plugins'), ROOT)).toBe(true);
		expect(isInside(`${ROOT}-sibling`, ROOT)).toBe(false);
	});

	it('runs in the CI validate job', () => {
		const workflow = readFileSync(join(ROOT, '.github/workflows/validate.yml'), 'utf-8');
		expect(workflow).toContain('node scripts/pack-harness.mjs');
	});
});
