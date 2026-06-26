import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
	normalizeProjectKey,
	fsProjectFiles,
	memoryProjectFiles,
	recordingProjectFiles,
	type ProjectFilesAccess,
} from '../src/project-files.js';

describe('normalizeProjectKey', () => {
	it('normalizes relative paths to POSIX keys', () => {
		expect(normalizeProjectKey('a/b/c.md')).toBe('a/b/c.md');
		expect(normalizeProjectKey('a\\b\\c.md')).toBe('a/b/c.md');
		expect(normalizeProjectKey('./a/./b.md')).toBe('a/b.md');
		expect(normalizeProjectKey('a//b.md')).toBe('a/b.md');
		expect(normalizeProjectKey('a/d/../b.md')).toBe('a/b.md');
	});
	it('normalizes empty / dot to the root key', () => {
		expect(normalizeProjectKey('')).toBe('');
		expect(normalizeProjectKey('.')).toBe('');
	});
	it('rejects absolute paths', () => {
		expect(normalizeProjectKey('/etc/passwd')).toBeNull();
		expect(normalizeProjectKey('\\windows')).toBeNull();
		expect(normalizeProjectKey('C:/Windows')).toBeNull();
	});
	it('rejects traversal that escapes the root', () => {
		expect(normalizeProjectKey('../escape.md')).toBeNull();
		expect(normalizeProjectKey('a/../../escape.md')).toBeNull();
	});
});

describe('fsProjectFiles', () => {
	let root: string;

	beforeAll(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'projectfiles-'));
		fs.mkdirSync(path.join(root, 'content'), { recursive: true });
		fs.writeFileSync(path.join(root, 'content', 'index.md'), '# Home\n');
		fs.writeFileSync(path.join(root, 'content', 'about.md'), '# About\n');
		fs.mkdirSync(path.join(root, 'content', 'sub'), { recursive: true });
		fs.writeFileSync(path.join(root, 'content', 'sub', 'nested.md'), 'nested\n');

		// Outside-the-root secret + a symlink inside the root pointing at it.
		const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'projectfiles-outside-'));
		fs.writeFileSync(path.join(outsideDir, 'secret.txt'), 'top secret\n');
		try {
			fs.symlinkSync(path.join(outsideDir, 'secret.txt'), path.join(root, 'escape-link.txt'));
		} catch {
			// Symlink creation may be unavailable (e.g. restricted CI) — the
			// symlink-escape test guards on existence below.
		}
	});

	afterAll(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	it('reads contained files', () => {
		const pf = fsProjectFiles(root);
		expect(pf.read('content/index.md')).toBe('# Home\n');
		expect(pf.read('content/sub/nested.md')).toBe('nested\n');
	});

	it('returns null for missing files and directories', () => {
		const pf = fsProjectFiles(root);
		expect(pf.read('content/missing.md')).toBeNull();
		expect(pf.read('content')).toBeNull(); // a directory is not a file
	});

	it('lists immediate child entry names', () => {
		const pf = fsProjectFiles(root);
		expect(pf.list('content').sort()).toEqual(['about.md', 'index.md', 'sub']);
		expect(pf.list('content/missing')).toEqual([]);
	});

	it('reports existence for files and directories', () => {
		const pf = fsProjectFiles(root);
		expect(pf.exists('content/index.md')).toBe(true);
		expect(pf.exists('content/sub')).toBe(true);
		expect(pf.exists('content/missing.md')).toBe(false);
	});

	it('rejects absolute paths', () => {
		const pf = fsProjectFiles(root);
		expect(pf.read('/etc/passwd')).toBeNull();
		expect(pf.exists('/etc/passwd')).toBe(false);
		expect(pf.list('/etc')).toEqual([]);
	});

	it('rejects `..` traversal out of the root', () => {
		const pf = fsProjectFiles(root);
		expect(pf.read('../escape.md')).toBeNull();
		expect(pf.read('content/../../escape.md')).toBeNull();
		expect(pf.exists('..')).toBe(false);
	});

	it('rejects reads through a symlink that escapes the root', () => {
		// Skip when the test setup could not create the symlink.
		if (!fs.existsSync(path.join(root, 'escape-link.txt'))) return;
		const pf = fsProjectFiles(root);
		expect(pf.read('escape-link.txt')).toBeNull();
		expect(pf.exists('escape-link.txt')).toBe(false);
	});
});

describe('memoryProjectFiles', () => {
	const files = new Map<string, string>([
		['content/index.md', '# Home\n'],
		['content/about.md', '# About\n'],
		['content/sub/nested.md', 'nested\n'],
		['data/sales.csv', 'a,b\n'],
	]);

	it('reads contained files', () => {
		const pf = memoryProjectFiles(files);
		expect(pf.read('content/index.md')).toBe('# Home\n');
		expect(pf.read('content/sub/nested.md')).toBe('nested\n');
		expect(pf.read('content/missing.md')).toBeNull();
	});

	it('normalizes the query path before lookup', () => {
		const pf = memoryProjectFiles(files);
		expect(pf.read('content/./index.md')).toBe('# Home\n');
		expect(pf.read('content\\index.md')).toBe('# Home\n');
		expect(pf.read('content/sub/../index.md')).toBe('# Home\n');
	});

	it('derives immediate child names from key prefixes', () => {
		const pf = memoryProjectFiles(files);
		expect(pf.list('content').sort()).toEqual(['about.md', 'index.md', 'sub']);
		expect(pf.list('content/sub')).toEqual(['nested.md']);
		expect(pf.list('').sort()).toEqual(['content', 'data']);
		expect(pf.list('content/missing')).toEqual([]);
	});

	it('reports existence for files and directory prefixes', () => {
		const pf = memoryProjectFiles(files);
		expect(pf.exists('content/index.md')).toBe(true);
		expect(pf.exists('content')).toBe(true);
		expect(pf.exists('content/sub')).toBe(true);
		expect(pf.exists('content/missing')).toBe(false);
	});

	it('returns null/empty for traversal and absolute paths', () => {
		const pf = memoryProjectFiles(files);
		expect(pf.read('../escape.md')).toBeNull();
		expect(pf.read('/content/index.md')).toBeNull();
		expect(pf.list('..')).toEqual([]);
		expect(pf.exists('../escape.md')).toBe(false);
	});

	it('reads through to a mutable backing map (warm-instance refresh)', () => {
		const mutable = new Map(files);
		const pf = memoryProjectFiles(mutable);
		expect(pf.read('content/new.md')).toBeNull();
		mutable.set('content/new.md', '# New\n');
		expect(pf.read('content/new.md')).toBe('# New\n');
		expect(pf.list('content')).toContain('new.md');
	});
});

describe('recordingProjectFiles', () => {
	it('forwards every call to the inner provider unchanged', () => {
		const inner = memoryProjectFiles(new Map([['content/index.md', '# Home\n']]));
		const accesses: ProjectFilesAccess[] = [];
		const pf = recordingProjectFiles(inner, (a) => accesses.push(a));

		expect(pf.read('content/index.md')).toBe('# Home\n');
		expect(pf.list('content')).toEqual(['index.md']);
		expect(pf.exists('content/index.md')).toBe(true);

		expect(accesses).toEqual([
			{ op: 'read', key: 'content/index.md' },
			{ op: 'list', key: 'content' },
			{ op: 'exists', key: 'content/index.md' },
		]);
	});

	it('records the accessed key even when the read is denied or absent', () => {
		const inner = memoryProjectFiles(new Map());
		const accesses: ProjectFilesAccess[] = [];
		const pf = recordingProjectFiles(inner, (a) => accesses.push(a));

		expect(pf.read('../escape.md')).toBeNull();
		expect(pf.read('content/missing.md')).toBeNull();

		expect(accesses.map((a) => a.key)).toEqual(['../escape.md', 'content/missing.md']);
	});
});
