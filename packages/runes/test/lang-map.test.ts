import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { LANG_MAP, FALLBACK_LANG, inferLanguage } from '../src/lang-map.js';

describe('LANG_MAP', () => {
	it('covers the SPEC-062 documented extensions', () => {
		const expected: Record<string, string> = {
			'.ts': 'typescript',
			'.tsx': 'typescript',
			'.js': 'javascript',
			'.jsx': 'javascript',
			'.mjs': 'javascript',
			'.cjs': 'javascript',
			'.svelte': 'svelte',
			'.vue': 'vue',
			'.md': 'markdoc',
			'.markdoc': 'markdoc',
			'.json': 'json',
			'.jsonc': 'jsonc',
			'.html': 'html',
			'.css': 'css',
			'.yml': 'yaml',
			'.yaml': 'yaml',
			'.toml': 'toml',
			'.sh': 'bash',
			'.bash': 'bash',
		};
		for (const [ext, lang] of Object.entries(expected)) {
			expect(LANG_MAP[ext]).toBe(lang);
		}
	});

	it('is frozen so consumers cannot mutate it', () => {
		expect(() => {
			(LANG_MAP as Record<string, string>)['.new'] = 'new-lang';
		}).toThrow();
	});

	it('exports a fallback constant of `"text"`', () => {
		expect(FALLBACK_LANG).toBe('text');
	});
});

describe('inferLanguage', () => {
	it('infers from a full file path', () => {
		expect(inferLanguage('src/lib/foo.ts')).toBe('typescript');
		expect(inferLanguage('config/refrakt.json')).toBe('json');
		expect(inferLanguage('examples/button.svelte')).toBe('svelte');
	});

	it('infers from a path with Windows separators', () => {
		expect(inferLanguage('src\\lib\\foo.ts')).toBe('typescript');
	});

	it('infers from a bare extension with dot', () => {
		expect(inferLanguage('.ts')).toBe('typescript');
		expect(inferLanguage('.svelte')).toBe('svelte');
	});

	it('infers from a bare extension without dot', () => {
		expect(inferLanguage('ts')).toBe('typescript');
		expect(inferLanguage('json')).toBe('json');
	});

	it('is case-insensitive', () => {
		expect(inferLanguage('FOO.TS')).toBe('typescript');
		expect(inferLanguage('Config.JSON')).toBe('json');
	});

	it('falls back to "text" for unknown extensions', () => {
		expect(inferLanguage('foo.unknown')).toBe(FALLBACK_LANG);
		expect(inferLanguage('binary.bin')).toBe(FALLBACK_LANG);
		expect(inferLanguage('.weird')).toBe(FALLBACK_LANG);
	});

	it('falls back to "text" for empty / non-string input', () => {
		expect(inferLanguage('')).toBe(FALLBACK_LANG);
		// @ts-expect-error — exercising defensive path
		expect(inferLanguage(undefined)).toBe(FALLBACK_LANG);
		// @ts-expect-error — same
		expect(inferLanguage(null)).toBe(FALLBACK_LANG);
	});

	it('handles file names with multiple dots', () => {
		expect(inferLanguage('foo.test.ts')).toBe('typescript');
		expect(inferLanguage('component.spec.tsx')).toBe('typescript');
		expect(inferLanguage('config.local.json')).toBe('json');
	});

	it('treats the last segment of a path correctly even when other segments contain dots', () => {
		expect(inferLanguage('node_modules/.cache/foo.ts')).toBe('typescript');
		expect(inferLanguage('weird.path/foo')).toBe(FALLBACK_LANG); // no extension on final segment
	});
});
