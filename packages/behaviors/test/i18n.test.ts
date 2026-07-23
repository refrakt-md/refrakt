/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { bstr, elStr, BEHAVIOR_STRINGS, __resetBehaviorStringCache } from '../src/i18n.js';

function setBlock(json: string | null) {
	document.getElementById('rf-strings')?.remove();
	if (json !== null) {
		const s = document.createElement('script');
		s.type = 'application/json';
		s.id = 'rf-strings';
		s.textContent = json;
		document.body.appendChild(s);
	}
	__resetBehaviorStringCache();
}

beforeEach(() => {
	document.body.innerHTML = '';
	__resetBehaviorStringCache();
});

describe('bstr — runtime-created strings', () => {
	it('falls back to the English default with no block (no flash-of-English)', () => {
		setBlock(null);
		expect(bstr('behavior.copy.copy')).toBe('Copy code');
		expect(bstr('behavior.search.noResults')).toBe('No results found.');
	});

	it('resolves from the inline JSON block when present', () => {
		setBlock(JSON.stringify({ 'behavior.copy.copy': 'Code kopieren' }));
		expect(bstr('behavior.copy.copy')).toBe('Code kopieren');
		// Unlisted key still falls to English per key.
		expect(bstr('behavior.copy.copied')).toBe('Copied');
	});

	it('interpolates {n}', () => {
		setBlock(JSON.stringify({ 'behavior.gallery.viewImage': 'Bild {n} ansehen' }));
		expect(bstr('behavior.gallery.viewImage', 3)).toBe('Bild 3 ansehen');
		setBlock(null);
		expect(bstr('behavior.gallery.viewImage', 3)).toBe('View image 3');
	});

	it('survives a malformed block (English fallback)', () => {
		setBlock('{ not valid json');
		expect(bstr('behavior.copy.copy')).toBe('Copy code');
	});
});

describe('elStr — element-attached strings', () => {
	it('prefers the element data-i18n-* attribute', () => {
		setBlock(JSON.stringify({ 'behavior.copy.copy': 'from-block' }));
		const el = document.createElement('pre');
		el.setAttribute('data-i18n-copy', 'from-element');
		expect(elStr(el, 'data-i18n-copy', 'behavior.copy.copy')).toBe('from-element');
	});

	it('falls to the block, then English, when no attribute is set', () => {
		setBlock(JSON.stringify({ 'behavior.copy.copy': 'from-block' }));
		const el = document.createElement('pre');
		expect(elStr(el, 'data-i18n-copy', 'behavior.copy.copy')).toBe('from-block');
		setBlock(null);
		expect(elStr(el, 'data-i18n-copy', 'behavior.copy.copy')).toBe('Copy code');
	});
});

describe('BEHAVIOR_STRINGS catalog', () => {
	it('covers all keyed behavior/element string zones', () => {
		expect(BEHAVIOR_STRINGS['behavior.form.success']).toBeDefined();
		expect(BEHAVIOR_STRINGS['behavior.audio.play']).toBeDefined();
		expect(BEHAVIOR_STRINGS['behavior.map.moreInfo']).toBeDefined();
		expect(BEHAVIOR_STRINGS['behavior.carousel.next']).toBeDefined();
		expect(BEHAVIOR_STRINGS['behavior.mobileMenu.open']).toBeDefined();
	});
});
