import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getGitTimestamps, getStatTimestamps, resolveTimestamps, type FileTimestamps } from '../src/timestamps.js';

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
