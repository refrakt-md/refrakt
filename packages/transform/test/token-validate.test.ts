import { describe, it, expect } from 'vitest';
import { validateThemeTokensConfig, formatTokenValidationErrors } from '../src/token-validate.js';

describe('validateThemeTokensConfig', () => {
	it('accepts an empty config', () => {
		const r = validateThemeTokensConfig({});
		expect(r.valid).toBe(true);
		expect(r.errors).toEqual([]);
	});

	it('accepts valid base tokens', () => {
		const r = validateThemeTokensConfig({
			color: {
				text: '#1c1a17',
				primary: '#7c3aed',
				surface: { base: '#fcfaf6', hover: '#efece5' },
				info: { base: '#34547a', bg: '#e8edf4', border: '#c5d2e0' },
			},
			font: { sans: 'Inter, sans-serif' },
		});
		expect(r.valid).toBe(true);
	});

	it('accepts the SPEC-094 typographic namespaces', () => {
		const r = validateThemeTokensConfig({
			font: { display: "'Fraunces', serif" },
			text: { xs: '0.75rem', base: '1rem', '4xl': '2.5rem' },
			weight: { normal: '400', bold: '700' },
			leading: { tight: '1.2', normal: '1.5' },
			tracking: { normal: '0', wide: '0.03em' },
		});
		expect(r.valid).toBe(true);
	});

	it('rejects a typo in the type scale', () => {
		const r = validateThemeTokensConfig({ text: { xxl: '2rem' } });
		expect(r.valid).toBe(false);
		expect(r.errors[0].path).toBe('text.xxl');
		expect(r.errors[0].message).toContain("unknown token key 'xxl'");
	});

	it('rejects unknown top-level namespace', () => {
		const r = validateThemeTokensConfig({ nonsense: { foo: 'bar' } });
		expect(r.valid).toBe(false);
		expect(r.errors[0].message).toContain("unknown token key 'nonsense'");
	});

	it('rejects unknown nested key (typo)', () => {
		const r = validateThemeTokensConfig({ color: { primery: '#000' } });
		expect(r.valid).toBe(false);
		expect(r.errors[0].path).toBe('color.primery');
		expect(r.errors[0].message).toContain("unknown token key 'primery'");
	});

	it('rejects deeply nested unknown key', () => {
		const r = validateThemeTokensConfig({
			color: { surface: { bottom: '#fff' } },
		});
		expect(r.valid).toBe(false);
		expect(r.errors[0].path).toBe('color.surface.bottom');
	});

	it('rejects non-string leaf values', () => {
		const r = validateThemeTokensConfig({ color: { text: 123 } });
		expect(r.valid).toBe(false);
		expect(r.errors[0].path).toBe('color.text');
		expect(r.errors[0].message).toContain('must be a string');
	});

	it('accepts null and undefined leaves (interpreted as inherit-up)', () => {
		const r = validateThemeTokensConfig({
			color: { text: null, primary: undefined } as unknown as Record<string, string>,
		});
		expect(r.valid).toBe(true);
	});

	it('rejects a non-object namespace position', () => {
		const r = validateThemeTokensConfig({ color: 'red' });
		expect(r.valid).toBe(false);
		expect(r.errors[0].message).toContain('must be a plain object');
	});

	it('validates inside modes overlays', () => {
		const r = validateThemeTokensConfig({
			modes: {
				dark: { color: { primery: '#aaa' } },
			},
		});
		expect(r.valid).toBe(false);
		expect(r.errors[0].path).toBe('modes.dark.color.primery');
	});

	it('rejects extra values that are not strings', () => {
		const r = validateThemeTokensConfig({
			extra: { 'rf-x': 'red', 'rf-y': 42 },
		});
		expect(r.valid).toBe(false);
		expect(r.errors[0].path).toBe('extra.rf-y');
	});

	it('accepts extras with arbitrary string keys (escape hatch)', () => {
		const r = validateThemeTokensConfig({
			extra: { 'rf-hero-overlay': 'rgba(0,0,0,0.5)', 'my-custom-token': '#abc' },
		});
		expect(r.valid).toBe(true);
	});

	it('collects all errors rather than failing on the first', () => {
		const r = validateThemeTokensConfig({
			color: { primery: '#aaa', txt: '#bbb' },
			radius: 'not-an-object',
		});
		expect(r.valid).toBe(false);
		expect(r.errors).toHaveLength(3);
	});

	it('rejects non-object input at the root', () => {
		const r = validateThemeTokensConfig('hello');
		expect(r.valid).toBe(false);
		expect(r.errors[0].message).toContain('must be a plain object');
	});

	it('validates the full neutral-default + niwaki composition shape', () => {
		// Representative real config — verifies the full surface accepts a complete config
		const r = validateThemeTokensConfig({
			color: {
				text: '#1c1a17', muted: '#6b6661', border: '#e8e5df', bg: '#f6f4ef',
				primary: '#1c1a17', 'primary-hover': '#3a342d',
				surface: { base: '#fcfaf6', hover: '#efece5', active: '#e8e5df', raised: '#ffffff' },
				info: { base: '#34547a', bg: '#e8edf4', border: '#c5d2e0' },
				warning: { base: '#9c5a18', bg: '#f5ebd9', border: '#e0c9a3' },
				danger: { base: '#a83232', bg: '#f5e0e0', border: '#e0b8b8' },
				success: { base: '#2d6a3e', bg: '#e0eee4', border: '#b8d4be' },
				code: { bg: '#ebeae8', text: '#1c1a17', 'inline-bg': '#e6e5e3' },
			},
			syntax: {
				keyword: '#2a5c63', function: '#4a3b6e', string: '#8a3a3a',
				constant: '#876327', comment: '#8a857d',
				punctuation: '#6b6661', variable: '#1c1a17',
			},
			modes: {
				dark: {
					color: { bg: '#1c1a17', text: '#f6f4ef' },
					syntax: { keyword: '#7eb6bc' },
				},
			},
		});
		expect(r.valid).toBe(true);
	});
});

describe('formatTokenValidationErrors', () => {
	it('returns empty string for valid results', () => {
		expect(formatTokenValidationErrors({ valid: true, errors: [] })).toBe('');
	});

	it('formats errors as a bulleted multi-line message', () => {
		const msg = formatTokenValidationErrors({
			valid: false,
			errors: [
				{ path: 'color.primery', message: "unknown token key 'primery' at color" },
				{ path: 'color.text', message: 'color.text must be a string (got number)' },
			],
		});
		expect(msg).toContain('theme.tokens validation failed:');
		expect(msg).toContain("unknown token key 'primery'");
		expect(msg).toContain('must be a string');
	});
});
