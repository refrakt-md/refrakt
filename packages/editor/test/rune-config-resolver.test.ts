import { describe, it, expect } from 'vitest';
import type { ThemeConfig } from '@refrakt-md/transform';
import { makeRuneConfigResolver } from '../src/server.js';

// The editor surfaces register-gated affordances (the dropcap toggle, SPEC-108)
// from each rune's `defaultReading`. That join is the trickiest part: a rune's CLI
// `name` is kebab and often does NOT equal kebab(config key) — `pullquote` vs
// `PullQuote` → `pull-quote`. The resolver must match anyway (typeName, then
// separator-insensitive name/aliases), exactly as the identity transform does.
const config: ThemeConfig = {
	prefix: 'rf', tokenPrefix: '--rf', icons: {},
	runes: {
		PullQuote: { block: 'pullquote', defaultReading: 'prose' },
		TextBlock: { block: 'textblock', defaultReading: 'prose' },
		Caption: { block: 'caption', defaultReading: 'fine' },
		Card: { block: 'card' },
		// A plugin-style entry with no typeName, matched by name.
		Lore: { block: 'lore', defaultReading: 'prose' },
	},
};

describe('makeRuneConfigResolver (SPEC-108 defaultReading join)', () => {
	const resolve = makeRuneConfigResolver(config);

	it('matches a core rune by typeName', () => {
		expect(resolve({ name: 'pullquote', typeName: 'PullQuote' })?.defaultReading).toBe('prose');
	});

	it('matches separator-insensitively when name ≠ kebab(typeName)', () => {
		// `pullquote` vs kebab(PullQuote)=`pull-quote`; `textblock` vs `text-block`.
		expect(resolve({ name: 'pullquote' })?.defaultReading).toBe('prose');
		expect(resolve({ name: 'textblock' })?.defaultReading).toBe('prose');
	});

	it('resolves a plugin rune (no typeName) by name', () => {
		expect(resolve({ name: 'lore' })?.defaultReading).toBe('prose');
	});

	it('returns the fine register and undefined for non-prose / unset runes', () => {
		expect(resolve({ name: 'caption' })?.defaultReading).toBe('fine');
		expect(resolve({ name: 'card' })?.defaultReading).toBeUndefined();
	});

	it('returns undefined for an unknown rune', () => {
		expect(resolve({ name: 'does-not-exist' })).toBeUndefined();
	});
});
