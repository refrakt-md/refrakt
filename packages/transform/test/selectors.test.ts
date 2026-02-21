import { describe, it, expect } from 'vitest';
import { extractSelectors } from '../src/selectors.js';
import { makeTag } from '../src/helpers.js';

describe('extractSelectors', () => {
	it('extracts block class selector', () => {
		const tag = makeTag('section', { class: 'rf-hint' }, []);
		expect(extractSelectors(tag, 'rf')).toContain('.rf-hint');
	});

	it('extracts modifier class selectors', () => {
		const tag = makeTag('section', { class: 'rf-hint rf-hint--warning' }, []);
		const selectors = extractSelectors(tag, 'rf');
		expect(selectors).toContain('.rf-hint');
		expect(selectors).toContain('.rf-hint--warning');
	});

	it('extracts element class selectors from children', () => {
		const tag = makeTag('section', { class: 'rf-hint' }, [
			makeTag('div', { class: 'rf-hint__header', 'data-name': 'header' }, [
				makeTag('span', { class: 'rf-hint__icon', 'data-name': 'icon' }, []),
				makeTag('span', { class: 'rf-hint__title', 'data-name': 'title' }, ['warning']),
			]),
		]);
		const selectors = extractSelectors(tag, 'rf');
		expect(selectors).toContain('.rf-hint');
		expect(selectors).toContain('.rf-hint__header');
		expect(selectors).toContain('.rf-hint__icon');
		expect(selectors).toContain('.rf-hint__title');
	});

	it('extracts data attribute selectors', () => {
		const tag = makeTag('section', {
			class: 'rf-hint',
			'data-rune': 'hint',
			'data-hint-type': 'warning',
		}, []);
		const selectors = extractSelectors(tag, 'rf');
		expect(selectors).toContain('[data-rune="hint"]');
		expect(selectors).toContain('[data-hint-type="warning"]');
	});

	it('ignores classes not matching the prefix', () => {
		const tag = makeTag('section', { class: 'rf-hint custom-class other-class' }, []);
		const selectors = extractSelectors(tag, 'rf');
		expect(selectors).toContain('.rf-hint');
		expect(selectors).not.toContain('.custom-class');
		expect(selectors).not.toContain('.other-class');
	});

	it('returns deduplicated selectors', () => {
		const tag = makeTag('section', { class: 'rf-hint' }, [
			makeTag('div', { class: 'rf-hint__body', 'data-name': 'body' }, []),
			makeTag('div', { class: 'rf-hint__body', 'data-name': 'body' }, []),
		]);
		const selectors = extractSelectors(tag, 'rf');
		const bodyCount = selectors.filter(s => s === '.rf-hint__body').length;
		expect(bodyCount).toBe(1);
	});

	it('sorts selectors: blocks, modifiers, elements, data attributes', () => {
		const tag = makeTag('section', {
			class: 'rf-hint rf-hint--warning',
			'data-rune': 'hint',
		}, [
			makeTag('span', { class: 'rf-hint__icon' }, []),
		]);
		const selectors = extractSelectors(tag, 'rf');
		const blockIdx = selectors.indexOf('.rf-hint');
		const modIdx = selectors.indexOf('.rf-hint--warning');
		const elemIdx = selectors.indexOf('.rf-hint__icon');
		const dataIdx = selectors.findIndex(s => s.startsWith('['));

		expect(blockIdx).toBeLessThan(modIdx);
		expect(modIdx).toBeLessThan(elemIdx);
		expect(elemIdx).toBeLessThan(dataIdx);
	});

	it('handles arrays of nodes', () => {
		const nodes = [
			makeTag('section', { class: 'rf-hint' }, []),
			makeTag('section', { class: 'rf-hero' }, []),
		];
		const selectors = extractSelectors(nodes, 'rf');
		expect(selectors).toContain('.rf-hint');
		expect(selectors).toContain('.rf-hero');
	});

	it('handles null/undefined/string nodes', () => {
		expect(extractSelectors(null, 'rf')).toEqual([]);
		expect(extractSelectors(undefined, 'rf')).toEqual([]);
		expect(extractSelectors('text' as any, 'rf')).toEqual([]);
	});

	it('extracts selectors from a fully transformed rune tree', () => {
		// Simulates a hint rune after identity transform
		const tag = makeTag('section', {
			class: 'rf-hint rf-hint--warning',
			'data-rune': 'hint',
			'data-hint-type': 'warning',
			typeof: 'Hint',
		}, [
			makeTag('div', { class: 'rf-hint__header', 'data-name': 'header' }, [
				makeTag('span', { class: 'rf-hint__icon', 'data-name': 'icon' }, []),
				makeTag('span', { class: 'rf-hint__title', 'data-name': 'title' }, ['warning']),
			]),
			makeTag('div', { class: 'rf-hint__body', 'data-name': 'body' }, [
				makeTag('p', {}, ['Check your settings']),
			]),
		]);

		const selectors = extractSelectors(tag, 'rf');
		expect(selectors).toEqual([
			'.rf-hint',
			'.rf-hint--warning',
			'.rf-hint__body',
			'.rf-hint__header',
			'.rf-hint__icon',
			'.rf-hint__title',
			'[data-hint-type="warning"]',
			'[data-name="body"]',
			'[data-name="header"]',
			'[data-name="icon"]',
			'[data-name="title"]',
			'[data-rune="hint"]',
		]);
	});
});
