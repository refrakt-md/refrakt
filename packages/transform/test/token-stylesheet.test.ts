import { describe, it, expect } from 'vitest';
import type { PartialTokenContract, ThemeTokensConfig } from '@refrakt-md/types';
import {
	generateTokenStylesheet,
	generateThemeStylesheet,
	tokenPathToCssVar,
} from '../src/token-stylesheet.js';

describe('tokenPathToCssVar', () => {
	it('maps a flat path with dot-to-dash join', () => {
		expect(tokenPathToCssVar(['color', 'text'])).toBe('--rf-color-text');
	});

	it('omits `base` from the variable name', () => {
		expect(tokenPathToCssVar(['color', 'surface', 'base'])).toBe('--rf-color-surface');
	});

	it('keeps non-base nested keys', () => {
		expect(tokenPathToCssVar(['color', 'surface', 'hover'])).toBe('--rf-color-surface-hover');
	});

	it('handles sentiment-base mapping', () => {
		expect(tokenPathToCssVar(['color', 'info', 'base'])).toBe('--rf-color-info');
		expect(tokenPathToCssVar(['color', 'info', 'bg'])).toBe('--rf-color-info-bg');
	});

	it('handles spacing.section.base → --rf-spacing-section', () => {
		expect(tokenPathToCssVar(['spacing', 'section', 'base'])).toBe('--rf-spacing-section');
		expect(tokenPathToCssVar(['spacing', 'section', 'tight'])).toBe('--rf-spacing-section-tight');
	});

	it('handles syntax tokens', () => {
		expect(tokenPathToCssVar(['syntax', 'keyword'])).toBe('--rf-syntax-keyword');
	});

	it('strips -scale suffix from segments (palette-step convention)', () => {
		expect(tokenPathToCssVar(['color', 'primary-scale', '500'])).toBe('--rf-color-primary-500');
		expect(tokenPathToCssVar(['color', 'primary-scale', '50'])).toBe('--rf-color-primary-50');
		expect(tokenPathToCssVar(['color', 'primary-scale', '950'])).toBe('--rf-color-primary-950');
	});
});

describe('generateTokenStylesheet', () => {
	it('returns empty string for empty input', () => {
		expect(generateTokenStylesheet({})).toBe('');
	});

	it('emits a single declaration', () => {
		const tokens: PartialTokenContract = { color: { text: '#1c1a17' } };
		expect(generateTokenStylesheet(tokens)).toBe(':root {\n\t--rf-color-text: #1c1a17;\n}\n');
	});

	it('walks nested namespaces', () => {
		const tokens: PartialTokenContract = {
			color: { surface: { base: '#fcfaf6', hover: '#efece5' } },
		};
		const css = generateTokenStylesheet(tokens);
		expect(css).toContain('--rf-color-surface: #fcfaf6;');
		expect(css).toContain('--rf-color-surface-hover: #efece5;');
	});

	it('respects the selector option', () => {
		const tokens: PartialTokenContract = { color: { text: '#000' } };
		expect(generateTokenStylesheet(tokens, { selector: '[data-theme="dark"]' }))
			.toBe('[data-theme="dark"] {\n\t--rf-color-text: #000;\n}\n');
	});

	it('appends extras after contract declarations', () => {
		const tokens: PartialTokenContract = { color: { text: '#000' } };
		const css = generateTokenStylesheet(tokens, { extra: { 'rf-hero-overlay': 'rgba(0,0,0,0.5)' } });
		expect(css).toContain('--rf-color-text: #000;');
		expect(css).toContain('--rf-hero-overlay: rgba(0,0,0,0.5);');
	});

	it('emits extras even when contract is empty', () => {
		expect(generateTokenStylesheet({}, { extra: { 'rf-x': 'red' } }))
			.toBe(':root {\n\t--rf-x: red;\n}\n');
	});

	it('skips both undefined and null leaves (null means "reset to inherit", not literal null)', () => {
		const tokens = { color: { text: undefined, primary: null, muted: '#888' } } as unknown as PartialTokenContract;
		const css = generateTokenStylesheet(tokens);
		expect(css).not.toContain('color-text');
		expect(css).not.toContain('color-primary');
		expect(css).toContain('--rf-color-muted: #888;');
	});

	it('emits syntax tokens with the syntax prefix', () => {
		const tokens: PartialTokenContract = {
			syntax: { keyword: '#2a5c63', string: '#8a3a3a' },
		};
		const css = generateTokenStylesheet(tokens);
		expect(css).toContain('--rf-syntax-keyword: #2a5c63;');
		expect(css).toContain('--rf-syntax-string: #8a3a3a;');
	});
});

describe('generateThemeStylesheet', () => {
	it('emits base block when only base tokens present', () => {
		const config: ThemeTokensConfig = { color: { text: '#000' } };
		const css = generateThemeStylesheet(config);
		// Base block targets `:root` plus `[data-color-scheme="light"]` so
		// subtrees forced to light pick up the site's base values.
		expect(css).toContain(':root, [data-color-scheme="light"] {');
		expect(css).toContain('--rf-color-text: #000;');
		expect(css).not.toContain('[data-theme=');
	});

	it('emits explicit and media-query blocks for the dark mode', () => {
		const config: ThemeTokensConfig = {
			color: { text: '#1c1a17' },
			modes: { dark: { color: { text: '#f6f4ef' } } },
		};
		const css = generateThemeStylesheet(config);
		expect(css).toContain(':root, [data-color-scheme="light"] {');
		expect(css).toContain('--rf-color-text: #1c1a17;');
		// Explicit block targets both `data-theme` (page toggle) and
		// `data-color-scheme` (subtree forced to a scheme — preview canvas,
		// sandbox iframes, juxtapose panels).
		expect(css).toContain('[data-theme="dark"], [data-color-scheme="dark"] {');
		expect(css).toContain('@media (prefers-color-scheme: dark)');
		// Uses :root:not([data-theme="light"]) — matches Lumina's hand-authored
		// dark.css pattern so generated overrides compose at equal specificity.
		expect(css).toContain(':root:not([data-theme="light"])');
	});

	it('does not emit a media-query block for non-light/dark modes', () => {
		const config: ThemeTokensConfig = {
			modes: { 'high-contrast': { color: { border: '#000' } } },
		};
		const css = generateThemeStylesheet(config);
		expect(css).toContain('[data-theme="high-contrast"], [data-color-scheme="high-contrast"] {');
		expect(css).not.toContain('@media (prefers-color-scheme: high-contrast)');
	});

	it('attaches extras to the base block', () => {
		const config: ThemeTokensConfig = {
			extra: { 'rf-hero-overlay': 'rgba(0,0,0,0.5)' },
		};
		const css = generateThemeStylesheet(config);
		expect(css).toContain(':root, [data-color-scheme="light"] {');
		expect(css).toContain('--rf-hero-overlay: rgba(0,0,0,0.5);');
	});

	it('produces deterministic output (same input → same string)', () => {
		const config: ThemeTokensConfig = {
			color: { text: '#000', primary: '#111' },
			modes: { dark: { color: { text: '#fff' } } },
		};
		const a = generateThemeStylesheet(config);
		const b = generateThemeStylesheet(config);
		expect(a).toBe(b);
	});
});
