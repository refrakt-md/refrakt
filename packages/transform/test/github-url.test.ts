import { describe, it, expect } from 'vitest';
import { buildGithubBlobUrl, formatLineAnchor } from '../src/github-url.js';

describe('buildGithubBlobUrl (SPEC-078)', () => {
	const repo = 'https://github.com/refrakt-md/refrakt';

	it('returns null when repoUrl is missing', () => {
		expect(buildGithubBlobUrl(undefined, 'main', 'packages/types/src/theme.ts')).toBeNull();
		expect(buildGithubBlobUrl('', 'main', 'packages/types/src/theme.ts')).toBeNull();
	});

	it('defaults repoBranch to "main" when omitted', () => {
		expect(buildGithubBlobUrl(repo, undefined, 'packages/types/src/theme.ts'))
			.toBe(`${repo}/blob/main/packages/types/src/theme.ts`);
		expect(buildGithubBlobUrl(repo, '', 'packages/types/src/theme.ts'))
			.toBe(`${repo}/blob/main/packages/types/src/theme.ts`);
	});

	it('accepts a tag as the ref', () => {
		expect(buildGithubBlobUrl(repo, 'v0.16.0', 'packages/types/src/theme.ts'))
			.toBe(`${repo}/blob/v0.16.0/packages/types/src/theme.ts`);
	});

	it('accepts a commit SHA as the ref (archival URLs)', () => {
		expect(buildGithubBlobUrl(repo, 'a1b2c3d4', 'packages/types/src/theme.ts'))
			.toBe(`${repo}/blob/a1b2c3d4/packages/types/src/theme.ts`);
	});

	it('appends a single-line anchor when lines is a single number', () => {
		expect(buildGithubBlobUrl(repo, 'main', 'foo.ts', '42'))
			.toBe(`${repo}/blob/main/foo.ts#L42`);
	});

	it('appends a range anchor when lines is start-end', () => {
		expect(buildGithubBlobUrl(repo, 'main', 'foo.ts', '42-58'))
			.toBe(`${repo}/blob/main/foo.ts#L42-L58`);
	});

	it('tolerates whitespace in the lines value', () => {
		expect(buildGithubBlobUrl(repo, 'main', 'foo.ts', '  42 - 58  '))
			.toBe(`${repo}/blob/main/foo.ts#L42-L58`);
	});

	it('strips trailing slash on repoUrl', () => {
		expect(buildGithubBlobUrl(`${repo}/`, 'main', 'foo.ts'))
			.toBe(`${repo}/blob/main/foo.ts`);
	});

	it('percent-encodes special characters in path segments but preserves /', () => {
		expect(buildGithubBlobUrl(repo, 'main', 'docs/My Folder/foo (bar).ts'))
			.toBe(`${repo}/blob/main/docs/My%20Folder/foo%20(bar).ts`);
	});

	it('round-trips a typical SPEC-078 example', () => {
		// The example from the spec.
		expect(buildGithubBlobUrl(
			'https://github.com/refrakt-md/refrakt',
			'main',
			'packages/types/src/token-contract.ts',
			'42-58',
		)).toBe(
			'https://github.com/refrakt-md/refrakt/blob/main/packages/types/src/token-contract.ts#L42-L58',
		);
	});
});

describe('formatLineAnchor', () => {
	it('returns L{n} for a single line', () => {
		expect(formatLineAnchor('42')).toBe('L42');
	});

	it('returns L{start}-L{end} for a range', () => {
		expect(formatLineAnchor('42-58')).toBe('L42-L58');
	});

	it('drops the end when only the dash separator was provided', () => {
		expect(formatLineAnchor('42-')).toBe('L42');
	});

	it('trims whitespace around the value', () => {
		expect(formatLineAnchor('  42  ')).toBe('L42');
		expect(formatLineAnchor(' 42 - 58 ')).toBe('L42-L58');
	});
});
