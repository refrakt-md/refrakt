import { describe, it, expect } from 'vitest';
import { isLayoutConfig } from '../src/theme.js';

describe('isLayoutConfig', () => {
	it('returns true for a LayoutConfig object', () => {
		expect(isLayoutConfig({ block: 'docs', slots: {} })).toBe(true);
	});

	it('returns true for a full LayoutConfig with all fields', () => {
		expect(isLayoutConfig({
			block: 'default',
			slots: { main: { tag: 'main', source: 'content' } },
			chrome: {},
			behaviors: ['mobile-menu'],
		})).toBe(true);
	});

	it('returns false for a function (Svelte component)', () => {
		expect(isLayoutConfig(function MyComponent() {})).toBe(false);
	});

	it('returns false for null', () => {
		expect(isLayoutConfig(null)).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(isLayoutConfig(undefined)).toBe(false);
	});

	it('returns false for a string', () => {
		expect(isLayoutConfig('docs')).toBe(false);
	});

	it('returns false for an object missing block', () => {
		expect(isLayoutConfig({ slots: {} })).toBe(false);
	});

	it('returns false for an object missing slots', () => {
		expect(isLayoutConfig({ block: 'docs' })).toBe(false);
	});
});
