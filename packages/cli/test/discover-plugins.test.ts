import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { discoverPlugins } from '../src/lib/plugins.js';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const PLAN_PKG = resolve(REPO_ROOT, 'runes/plan');

let tempDir: string;

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), 'refrakt-discover-'));
});

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true });
});

/** Create a fake project that points its node_modules at the real plan package
 *  (so the cli-plugin export resolves) and writes a package.json that lists the
 *  plan dependency. Returns the project root. */
function setupProjectWithPlan(opts: {
	configContents?: string;
	packageJson?: Record<string, unknown>;
}): string {
	const projectDir = tempDir;
	const nodeModules = join(projectDir, 'node_modules');
	mkdirSync(join(nodeModules, '@refrakt-md'), { recursive: true });
	symlinkSync(PLAN_PKG, join(nodeModules, '@refrakt-md/plan'));

	// Real plan depends on @refrakt-md/types and @refrakt-md/runes — also link those.
	for (const pkgDir of ['types', 'runes', 'transform']) {
		const target = resolve(REPO_ROOT, `packages/${pkgDir}`);
		symlinkSync(target, join(nodeModules, `@refrakt-md/${pkgDir}`));
	}
	// reflect-metadata is a runtime dep of plan
	const reflectSrc = resolve(REPO_ROOT, 'node_modules/reflect-metadata');
	symlinkSync(reflectSrc, join(nodeModules, 'reflect-metadata'));
	// markdoc too
	const markdocSrc = resolve(REPO_ROOT, 'node_modules/@markdoc/markdoc');
	mkdirSync(join(nodeModules, '@markdoc'), { recursive: true });
	symlinkSync(markdocSrc, join(nodeModules, '@markdoc/markdoc'));

	const pkg = opts.packageJson ?? {
		name: 'fixture',
		dependencies: { '@refrakt-md/plan': '*' },
	};
	writeFileSync(join(projectDir, 'package.json'), JSON.stringify(pkg, null, '\t'));
	if (opts.configContents !== undefined) {
		writeFileSync(join(projectDir, 'refrakt.config.json'), opts.configContents);
	}
	return projectDir;
}

describe('discoverPlugins', () => {
	it('discovers @refrakt-md/plan via package.json scanning', async () => {
		const cwd = setupProjectWithPlan({});
		const plugins = await discoverPlugins({ cwd, warn: false });
		expect(plugins).toHaveLength(1);
		const plan = plugins[0]!;
		expect(plan.namespace).toBe('plan');
		expect(plan.packageName).toBe('@refrakt-md/plan');
		expect(plan.packageVersion).toMatch(/^\d+\.\d+\.\d+/);
		expect(plan.source).toBe('dependency-scan');
		expect(plan.commands.length).toBeGreaterThan(0);
		expect(plan.commands.map((c) => c.name)).toContain('next');
	});

	it('uses config.plugins as authoritative when declared', async () => {
		const cwd = setupProjectWithPlan({
			configContents: JSON.stringify({
				plugins: ['@refrakt-md/plan'],
			}),
		});
		const plugins = await discoverPlugins({ cwd, warn: false });
		expect(plugins).toHaveLength(1);
		expect(plugins[0]!.source).toBe('config');
	});

	it('falls back to dependency scan when config has no plugins field', async () => {
		const cwd = setupProjectWithPlan({
			configContents: JSON.stringify({
				site: { contentDir: './content', theme: 't', target: 'svelte' },
			}),
		});
		const plugins = await discoverPlugins({ cwd, warn: false });
		expect(plugins).toHaveLength(1);
		expect(plugins[0]!.source).toBe('dependency-scan');
	});

	it('skips packages whose cli-plugin export is missing silently', async () => {
		// @refrakt-md/transform is in dependencies (via node_modules linkage)
		// but it has no cli-plugin export — should be skipped without warning.
		const cwd = setupProjectWithPlan({
			packageJson: {
				name: 'fixture',
				dependencies: {
					'@refrakt-md/plan': '*',
					'@refrakt-md/runes': '*', // listed but in META_PACKAGES so excluded entirely
				},
			},
		});
		const plugins = await discoverPlugins({ cwd, warn: false });
		// Only plan should be discovered; runes is in META_PACKAGES.
		expect(plugins.map((p) => p.namespace)).toEqual(['plan']);
	});

	it('returns an empty array when no plugins are installed', async () => {
		const cwd = tempDir;
		writeFileSync(
			join(cwd, 'package.json'),
			JSON.stringify({ name: 'empty', dependencies: {} }),
		);
		const plugins = await discoverPlugins({ cwd, warn: false });
		expect(plugins).toEqual([]);
	});

	it('returns an empty array when there is no package.json', async () => {
		const plugins = await discoverPlugins({ cwd: tempDir, warn: false });
		expect(plugins).toEqual([]);
	});

	it('sorts results alphabetically by namespace', async () => {
		const cwd = setupProjectWithPlan({});
		const plugins = await discoverPlugins({ cwd, warn: false });
		const names = plugins.map((p) => p.namespace);
		const sorted = [...names].sort();
		expect(names).toEqual(sorted);
	});
});
