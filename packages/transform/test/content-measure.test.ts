import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const asTag = (n: any): SerializedTag => n as SerializedTag;

const config: ThemeConfig = {
	prefix: 'rf', tokenPrefix: '--rf', icons: {},
	runes: {
		// Page section: anchors its content when bled to the wide track.
		Hero: { block: 'hero', defaultWidth: 'full', contentMeasure: 'anchored' },
		// Content rune: fills the wide track (default breakout).
		Card: { block: 'card' },
	},
};

describe('data-content-measure (width-tier content anchoring)', () => {
	it('emits anchored on a page-section rune', () => {
		const t = createTransform(config);
		const hero = asTag(t(makeTag('div', { 'data-rune': 'hero', width: 'wide' }, [makeTag('p', {}, ['x'])])));
		expect(hero.attributes['data-content-measure']).toBe('anchored');
	});

	it('is absent (fill) on a content rune', () => {
		const t = createTransform(config);
		const card = asTag(t(makeTag('div', { 'data-rune': 'card', width: 'wide' }, [makeTag('p', {}, ['x'])])));
		expect(card.attributes['data-content-measure']).toBeUndefined();
	});

	it('is emitted regardless of the width tier (it is a rune property)', () => {
		const t = createTransform(config);
		const heroFull = asTag(t(makeTag('div', { 'data-rune': 'hero' }, [makeTag('p', {}, ['x'])])));
		expect(heroFull.attributes['data-content-measure']).toBe('anchored');
	});
});
