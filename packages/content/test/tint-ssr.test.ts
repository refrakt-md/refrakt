import { describe, it, expect } from 'vitest';
import { htmlTintAttributes, colorSchemeMetaContent, prePaintScript } from '../src/tint-ssr.js';
import type { ResolvedTintCascade } from '../src/tint-cascade.js';

const defaults: ResolvedTintCascade = { tint: null, tintMode: 'auto', locked: false };

describe('htmlTintAttributes', () => {
	it('returns empty string for default cascade', () => {
		expect(htmlTintAttributes(defaults)).toBe('');
	});

	it('emits data-theme for locked dark', () => {
		expect(htmlTintAttributes({ ...defaults, tintMode: 'dark' })).toBe('data-theme="dark"');
	});

	it('omits data-theme when tintMode is auto', () => {
		expect(htmlTintAttributes({ ...defaults, tintMode: 'auto' })).toBe('');
	});

	it('emits data-tint for a named tint', () => {
		expect(htmlTintAttributes({ ...defaults, tint: 'warm' })).toBe('data-tint="warm"');
	});

	it('emits data-tint-lock when locked', () => {
		expect(htmlTintAttributes({ ...defaults, locked: true })).toBe('data-tint-lock="true"');
	});

	it('combines all three when set', () => {
		const result = htmlTintAttributes({ tint: 'brand-warm', tintMode: 'dark', locked: true });
		expect(result).toBe('data-theme="dark" data-tint="brand-warm" data-tint-lock="true"');
	});

	it('escapes attribute values', () => {
		const result = htmlTintAttributes({ ...defaults, tint: 'bad"value<' });
		expect(result).toBe('data-tint="bad&quot;value&lt;"');
	});
});

describe('colorSchemeMetaContent', () => {
	it('returns "light dark" for the default unlocked cascade', () => {
		expect(colorSchemeMetaContent(defaults)).toBe('light dark');
	});

	it('returns the locked mode when locked + explicit', () => {
		expect(colorSchemeMetaContent({ tint: null, tintMode: 'dark', locked: true })).toBe('dark');
		expect(colorSchemeMetaContent({ tint: null, tintMode: 'light', locked: true })).toBe('light');
	});

	it('returns "light dark" when locked but mode is auto', () => {
		expect(colorSchemeMetaContent({ tint: null, tintMode: 'auto', locked: true })).toBe('light dark');
	});

	it('returns "light dark" when explicit but not locked (user can override)', () => {
		expect(colorSchemeMetaContent({ tint: null, tintMode: 'dark', locked: false })).toBe('light dark');
	});
});

describe('prePaintScript', () => {
	const script = prePaintScript();

	it('reads from the rf-theme localStorage key', () => {
		expect(script).toContain("'rf-theme'");
	});

	it('respects data-tint-lock and bails on locked pages', () => {
		expect(script).toContain('tintLock');
	});

	it('falls back to prefers-color-scheme: dark media query', () => {
		expect(script).toContain('prefers-color-scheme: dark');
	});

	it('sets data-theme on document.documentElement', () => {
		expect(script).toContain("setAttribute('data-theme'");
	});

	it('is wrapped in an IIFE for scope isolation', () => {
		expect(script.startsWith('(function()')).toBe(true);
		expect(script.endsWith(')();')).toBe(true);
	});

	it('is small enough to inline without bloating the head', () => {
		expect(script.length).toBeLessThan(500);
	});
});
