import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { getGitTimestamps, getStatTimestamps, resolveTimestamps, generateTimestampsCache, writeTimestampsCache, loadTimestampsCache, type FileTimestamps } from '../src/timestamps.js';

describe('getGitTimestamps', () => {
	it('should return a Map', () => {
		// Running in the actual refrakt repo, so git data should be available
		const result = getGitTimestamps('.');
		expect(result).toBeInstanceOf(Map);
	});

	it('should return ISO 8601 date strings (YYYY-MM-DD)', () => {
		const result = getGitTimestamps('.');
		for (const [, ts] of result) {
			if (ts.modified) {
				expect(ts.modified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			}
			if (ts.created) {
				expect(ts.created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			}
		}
	});

	it('should return an empty map for a non-existent directory', () => {
		const result = getGitTimestamps('/tmp/nonexistent-dir-' + Date.now());
		expect(result.size).toBe(0);
	});
});

describe('getStatTimestamps', () => {
	it('should return timestamps for an existing file', () => {
		const result = getStatTimestamps('package.json');
		expect(result.modified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('should return undefined values for a non-existent file', () => {
		const result = getStatTimestamps('/tmp/nonexistent-file-' + Date.now());
		expect(result.created).toBeUndefined();
		expect(result.modified).toBeUndefined();
	});
});

describe('resolveTimestamps', () => {
	const gitMap = new Map<string, FileTimestamps>([
		['page.md', { created: '2025-01-15', modified: '2025-06-20' }],
	]);

	it('should use git timestamps when no frontmatter override', () => {
		const result = resolveTimestamps('page.md', '/abs/page.md', gitMap, {});
		expect(result.created).toBe('2025-01-15');
		expect(result.modified).toBe('2025-06-20');
	});

	it('should prefer frontmatter over git timestamps', () => {
		const result = resolveTimestamps('page.md', '/abs/page.md', gitMap, {
			created: '2024-01-01',
			modified: '2024-12-31',
		});
		expect(result.created).toBe('2024-01-01');
		expect(result.modified).toBe('2024-12-31');
	});

	it('should allow partial frontmatter overrides', () => {
		const result = resolveTimestamps('page.md', '/abs/page.md', gitMap, {
			created: '2024-01-01',
		});
		expect(result.created).toBe('2024-01-01');
		expect(result.modified).toBe('2025-06-20');
	});

	it('should return undefined when no data is available', () => {
		const emptyMap = new Map<string, FileTimestamps>();
		const result = resolveTimestamps('unknown.md', '/tmp/nonexistent-' + Date.now(), emptyMap, {});
		expect(result.created).toBeUndefined();
		expect(result.modified).toBeUndefined();
	});

	it('should ignore non-string frontmatter values', () => {
		const result = resolveTimestamps('page.md', '/abs/page.md', gitMap, {
			created: 42,
			modified: true,
		});
		expect(result.created).toBe('2025-01-15');
		expect(result.modified).toBe('2025-06-20');
	});
});

describe('generateTimestampsCache', () => {
	it('should return a plain object with FileTimestamps values', () => {
		const cache = generateTimestampsCache('.');
		expect(typeof cache).toBe('object');
		expect(cache).not.toBeInstanceOf(Map);

		// Should have entries (we're in a git repo)
		const keys = Object.keys(cache);
		expect(keys.length).toBeGreaterThan(0);

		// Each entry should have the expected shape
		for (const ts of Object.values(cache)) {
			if (ts.modified) {
				expect(ts.modified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			}
			if (ts.created) {
				expect(ts.created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			}
		}
	});
});

describe('writeTimestampsCache / loadTimestampsCache', () => {
	let tmpDir: string;
	let cachePath: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), 'ts-cache-'));
		cachePath = join(tmpDir, '.timestamps.json');
	});

	afterEach(() => {
		try { unlinkSync(cachePath); } catch {}
	});

	it('should write and load a cache file round-trip', () => {
		const count = writeTimestampsCache(cachePath, '.');
		expect(count).toBeGreaterThan(0);

		const loaded = loadTimestampsCache(cachePath);
		expect(loaded).not.toBeNull();
		expect(loaded).toBeInstanceOf(Map);
		expect(loaded!.size).toBe(count);

		for (const [, ts] of loaded!) {
			if (ts.modified) {
				expect(ts.modified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			}
		}
	});

	it('should return null for a non-existent cache file', () => {
		const result = loadTimestampsCache('/tmp/nonexistent-cache-' + Date.now() + '.json');
		expect(result).toBeNull();
	});

	it('should return null for an invalid JSON file', () => {
		writeFileSync(cachePath, 'not json');
		const result = loadTimestampsCache(cachePath);
		expect(result).toBeNull();
	});
});

describe('getGitTimestamps with cache', () => {
	let tmpDir: string;
	let cachePath: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), 'ts-cache-'));
		cachePath = join(tmpDir, '.timestamps.json');
	});

	afterEach(() => {
		try { unlinkSync(cachePath); } catch {}
	});

	it('should use cache when provided', () => {
		// Write a cache with known data
		const cacheData: Record<string, FileTimestamps> = {
			'plan/work/WORK-001.md': { created: '2025-01-01', modified: '2025-06-15' },
			'plan/spec/SPEC-001.md': { created: '2025-02-01', modified: '2025-07-20' },
		};
		writeFileSync(cachePath, JSON.stringify(cacheData));

		// When loading with cache, the results should come from the cache
		// (using '.' as contentDir since paths are git-root-relative and prefix is '')
		const result = getGitTimestamps('.', { cachePath });
		expect(result.get('plan/work/WORK-001.md')).toEqual({ created: '2025-01-01', modified: '2025-06-15' });
		expect(result.get('plan/spec/SPEC-001.md')).toEqual({ created: '2025-02-01', modified: '2025-07-20' });
	});

	it('should fall back to git when cache file is missing', () => {
		const result = getGitTimestamps('.', { cachePath: '/tmp/nonexistent-' + Date.now() + '.json' });
		// Should still return a Map (from git fallback)
		expect(result).toBeInstanceOf(Map);
	});
});
