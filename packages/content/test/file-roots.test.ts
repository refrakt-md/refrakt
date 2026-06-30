import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { memoryProjectFiles, fsProjectFiles } from '@refrakt-md/types/project-files';
import {
	resolveUserFileRoots,
	mergeFileRoots,
	readFileRoots,
	validateNamespacedReference,
} from '../src/file-roots.js';

describe('resolveUserFileRoots', () => {
	it('resolves each path relative to the config directory', () => {
		const result = resolveUserFileRoots(
			{ shared: '_shared', legal: '../legal-snippets' },
			'/projects/example/site',
		);
		expect(result.shared).toBe('/projects/example/site/_shared');
		expect(result.legal).toBe('/projects/example/legal-snippets');
	});

	it('returns empty when input is undefined or empty', () => {
		expect(resolveUserFileRoots(undefined, '/x')).toEqual({});
		expect(resolveUserFileRoots({}, '/x')).toEqual({});
	});

	it('rejects empty namespace names', () => {
		expect(() => resolveUserFileRoots({ '': '_x' }, '/x')).toThrow(/namespace name is empty/);
	});

	it('rejects the reserved namespace "site"', () => {
		expect(() => resolveUserFileRoots({ site: '_other' }, '/x')).toThrow(/reserved/);
	});

	it('rejects non-string / empty-string path values', () => {
		expect(() =>
			resolveUserFileRoots({ shared: '' as unknown as string }, '/x'),
		).toThrow(/non-empty string/);
		expect(() =>
			resolveUserFileRoots({ shared: 42 as unknown as string }, '/x'),
		).toThrow(/non-empty string/);
	});
});

describe('mergeFileRoots', () => {
	it('combines user and plugin roots with user winning collisions', () => {
		const result = mergeFileRoots(
			{ shared: '/user/_shared' },
			{ plan: '/plugin/plan', shared: '/plugin/_shared' },
		);
		expect(result.roots).toEqual({
			shared: '/user/_shared',
			plan: '/plugin/plan',
		});
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0]).toContain('shared');
	});

	it('produces no warning when there is no collision', () => {
		const result = mergeFileRoots(
			{ shared: '/user/_shared' },
			{ plan: '/plugin/plan' },
		);
		expect(result.warnings).toHaveLength(0);
		expect(result.roots).toEqual({
			shared: '/user/_shared',
			plan: '/plugin/plan',
		});
	});

	it('produces no warning when user and plugin agree on the path', () => {
		const result = mergeFileRoots(
			{ shared: '/agreed' },
			{ shared: '/agreed' },
		);
		expect(result.warnings).toHaveLength(0);
	});

	it('handles empty input maps', () => {
		expect(mergeFileRoots({}, {})).toEqual({ roots: {}, warnings: [] });
	});
});

describe('readFileRoots', () => {
	let tmpRoot: string;

	beforeEach(() => {
		tmpRoot = mkdtempSync(join(tmpdir(), 'refrakt-file-roots-'));
	});

	afterEach(() => {
		rmSync(tmpRoot, { recursive: true, force: true });
	});

	it('scans `.md` files into namespaced partials', async () => {
		const sharedDir = join(tmpRoot, 'shared');
		mkdirSync(sharedDir);
		writeFileSync(join(sharedDir, 'footer.md'), '# Footer');
		writeFileSync(join(sharedDir, 'cta.md'), '# CTA');
		writeFileSync(join(sharedDir, 'readme.txt'), 'ignored — not .md');

		const result = await readFileRoots({ shared: sharedDir });

		expect(result.has('shared:footer.md')).toBe(true);
		expect(result.has('shared:cta.md')).toBe(true);
		expect(result.has('shared:readme.txt')).toBe(false);
		expect(result.get('shared:footer.md')!.raw).toBe('# Footer');
	});

	it('preserves subdirectory paths in the key (POSIX slashes)', async () => {
		const sharedDir = join(tmpRoot, 'shared');
		const legalDir = join(sharedDir, 'legal');
		mkdirSync(legalDir, { recursive: true });
		writeFileSync(join(legalDir, 'terms.md'), '# Terms');

		const result = await readFileRoots({ shared: sharedDir });

		expect(result.has('shared:legal/terms.md')).toBe(true);
	});

	it('scans multiple roots and namespaces each', async () => {
		const sharedDir = join(tmpRoot, 'shared');
		const planDir = join(tmpRoot, 'plan');
		mkdirSync(sharedDir);
		mkdirSync(planDir);
		writeFileSync(join(sharedDir, 'a.md'), '# A');
		writeFileSync(join(planDir, 'b.md'), '# B');

		const result = await readFileRoots({ shared: sharedDir, plan: planDir });

		expect(result.has('shared:a.md')).toBe(true);
		expect(result.has('plan:b.md')).toBe(true);
		expect(result.size).toBe(2);
	});

	it('throws when a registered directory does not exist', async () => {
		await expect(
			readFileRoots({ ghost: join(tmpRoot, 'missing') }),
		).rejects.toThrow(/does not exist/);
	});

	it('throws when a registered path is a file, not a directory', async () => {
		const filePath = join(tmpRoot, 'notadir.md');
		writeFileSync(filePath, '# nope');
		await expect(readFileRoots({ bad: filePath })).rejects.toThrow(/expected a directory/);
	});

	it('returns an empty map when given no roots', async () => {
		const result = await readFileRoots({});
		expect(result.size).toBe(0);
	});
});

describe('readFileRoots through a ProjectFiles provider (SPEC-113)', () => {
	it('scans an in-project root through a pure in-memory provider (no fs)', async () => {
		const files = memoryProjectFiles(new Map([
			['site/shared/footer.md', '# Footer'],
			['site/shared/legal/terms.md', '# Terms'],
			['site/shared/readme.txt', 'ignored'],
		]));
		const result = await readFileRoots(
			{ shared: '/project/site/shared' },
			{ projectFiles: files, projectRoot: '/project' },
		);
		expect(result.has('shared:footer.md')).toBe(true);
		expect(result.has('shared:legal/terms.md')).toBe(true);
		expect(result.has('shared:readme.txt')).toBe(false);
		expect(result.get('shared:footer.md')!.raw).toBe('# Footer');
	});

	it('throws when the provider has no such directory', async () => {
		const files = memoryProjectFiles(new Map());
		await expect(
			readFileRoots({ ghost: '/project/missing' }, { projectFiles: files, projectRoot: '/project' }),
		).rejects.toThrow(/does not exist/);
	});

	it('falls back to fs for a root outside the project root', async () => {
		// `/elsewhere/shared` can't be a project-relative key under `/project`, so
		// the provider is bypassed and the fs path runs (and throws — no such dir).
		const files = memoryProjectFiles(new Map());
		await expect(
			readFileRoots({ shared: '/elsewhere/shared' }, { projectFiles: files, projectRoot: '/project' }),
		).rejects.toThrow(/does not exist/);
	});

	it('matches the fs scan for the same in-project tree', async () => {
		const map = new Map([['shared/a.md', '# A'], ['shared/nested/b.md', '# B']]);
		const viaProvider = await readFileRoots(
			{ shared: '/p/shared' },
			{ projectFiles: memoryProjectFiles(map), projectRoot: '/p' },
		);
		expect([...viaProvider.keys()].sort()).toEqual(['shared:a.md', 'shared:nested/b.md']);
	});
});

describe('validateNamespacedReference', () => {
	const roots = { shared: '/tmp/shared', plan: '/tmp/plan' };

	it('resolves a valid namespaced reference', () => {
		const result = validateNamespacedReference('shared:footer.md', roots);
		expect(result).toBe(resolve('/tmp/shared', 'footer.md'));
	});

	it('supports subdirectory paths', () => {
		const result = validateNamespacedReference('shared:legal/terms.md', roots);
		expect(result).toBe(resolve('/tmp/shared', 'legal/terms.md'));
	});

	it('rejects missing namespace prefix', () => {
		expect(() => validateNamespacedReference('footer.md', roots)).toThrow(/missing a namespace prefix/);
	});

	it('rejects empty namespace', () => {
		expect(() => validateNamespacedReference(':footer.md', roots)).toThrow(/missing a namespace prefix/);
	});

	it('rejects unknown namespace and lists registered ones', () => {
		expect(() => validateNamespacedReference('unknown:file.md', roots)).toThrow(/Unknown file-root namespace "unknown"/);
		expect(() => validateNamespacedReference('unknown:file.md', roots)).toThrow(/shared, plan/);
	});

	it('rejects absolute paths', () => {
		expect(() => validateNamespacedReference('shared:/abs.md', roots)).toThrow(/absolute path/);
	});

	it('rejects traversal that escapes the root', () => {
		expect(() => validateNamespacedReference('shared:../escape.md', roots)).toThrow(/escapes its root/);
	});

	it('rejects empty path after the colon', () => {
		expect(() => validateNamespacedReference('shared:', roots)).toThrow(/missing a path/);
	});
});
