import { describe, it, expect } from 'vitest';
import { parseCssFile, auditSelectors, collectAllSelectors } from '../src/lib/css-audit.js';

describe('parseCssFile', () => {
	it('extracts BEM block selectors', () => {
		const css = `.rf-hint { color: red; }`;
		const matches = parseCssFile(css, 'hint.css');
		expect(matches).toEqual([
			{ selector: '.rf-hint', file: 'hint.css', line: 1 },
		]);
	});

	it('extracts BEM modifier selectors', () => {
		const css = `.rf-hint--warning { color: orange; }`;
		const matches = parseCssFile(css, 'hint.css');
		expect(matches).toEqual([
			{ selector: '.rf-hint--warning', file: 'hint.css', line: 1 },
		]);
	});

	it('extracts BEM element selectors', () => {
		const css = `.rf-hint__icon { display: flex; }`;
		const matches = parseCssFile(css, 'hint.css');
		expect(matches).toEqual([
			{ selector: '.rf-hint__icon', file: 'hint.css', line: 1 },
		]);
	});

	it('extracts multiple selectors from compound rules', () => {
		const css = `.rf-hint--note .rf-hint__icon::before { mask-image: url("..."); }`;
		const matches = parseCssFile(css, 'hint.css');
		expect(matches).toContainEqual({ selector: '.rf-hint--note', file: 'hint.css', line: 1 });
		expect(matches).toContainEqual({ selector: '.rf-hint__icon', file: 'hint.css', line: 1 });
	});

	it('extracts data attribute selectors', () => {
		const css = `[data-method="GET"] .rf-api__method { color: green; }`;
		const matches = parseCssFile(css, 'api.css');
		expect(matches).toContainEqual({ selector: '[data-method="GET"]', file: 'api.css', line: 1 });
		expect(matches).toContainEqual({ selector: '.rf-api__method', file: 'api.css', line: 1 });
	});

	it('extracts data attribute selectors without values', () => {
		const css = `[data-rune] { margin: 0; }`;
		const matches = parseCssFile(css, 'base.css');
		expect(matches).toContainEqual({ selector: '[data-rune]', file: 'base.css', line: 1 });
	});

	it('handles comma-separated selectors', () => {
		const css = `.rf-hint__body p:last-child,\n.rf-hint__body ul { margin: 0; }`;
		const matches = parseCssFile(css, 'hint.css');
		const selectors = matches.map(m => m.selector);
		expect(selectors).toContain('.rf-hint__body');
		// Should appear twice (once per comma-separated selector)
		expect(selectors.filter(s => s === '.rf-hint__body')).toHaveLength(2);
	});

	it('ignores non .rf-* selectors', () => {
		const css = `.some-other-class { color: red; }\nbody { margin: 0; }`;
		const matches = parseCssFile(css, 'other.css');
		expect(matches).toHaveLength(0);
	});

	it('tracks correct line numbers', () => {
		const css = `.rf-hint { color: red; }\n\n\n.rf-hint__body { padding: 0; }`;
		const matches = parseCssFile(css, 'hint.css');
		expect(matches).toContainEqual({ selector: '.rf-hint', file: 'hint.css', line: 1 });
		expect(matches).toContainEqual({ selector: '.rf-hint__body', file: 'hint.css', line: 4 });
	});

	it('extracts file basename from full path', () => {
		const css = `.rf-hint { color: red; }`;
		const matches = parseCssFile(css, '/path/to/styles/runes/hint.css');
		expect(matches[0].file).toBe('hint.css');
	});
});

describe('auditSelectors', () => {
	it('marks styled selectors correctly', () => {
		const generated = ['.rf-hint', '.rf-hint--warning', '.rf-hint__body'];
		const cssMatches = [
			{ selector: '.rf-hint', file: 'hint.css', line: 1 },
			{ selector: '.rf-hint--warning', file: 'hint.css', line: 5 },
			{ selector: '.rf-hint__body', file: 'hint.css', line: 10 },
		];
		const result = auditSelectors('hint', generated, cssMatches);
		expect(result.total).toBe(3);
		expect(result.styled).toBe(3);
		expect(result.status).toBe('complete');
		expect(result.selectors['.rf-hint']).toEqual({ styled: true, file: 'hint.css', line: 1 });
	});

	it('marks unstyled selectors correctly', () => {
		const generated = ['.rf-hint', '.rf-hint--warning', '.rf-hint__body'];
		const cssMatches = [
			{ selector: '.rf-hint', file: 'hint.css', line: 1 },
		];
		const result = auditSelectors('hint', generated, cssMatches);
		expect(result.total).toBe(3);
		expect(result.styled).toBe(1);
		expect(result.status).toBe('partial');
		expect(result.selectors['.rf-hint--warning']).toEqual({ styled: false });
	});

	it('reports not-started when no selectors are styled', () => {
		const generated = ['.rf-hint', '.rf-hint__body'];
		const result = auditSelectors('hint', generated, []);
		expect(result.status).toBe('not-started');
		expect(result.styled).toBe(0);
	});

	it('uses the first CSS match for each selector', () => {
		const generated = ['.rf-hint'];
		const cssMatches = [
			{ selector: '.rf-hint', file: 'hint.css', line: 2 },
			{ selector: '.rf-hint', file: 'hint.css', line: 50 },
		];
		const result = auditSelectors('hint', generated, cssMatches);
		expect(result.selectors['.rf-hint']).toEqual({ styled: true, file: 'hint.css', line: 2 });
	});
});

describe('collectAllSelectors', () => {
	it('collects selectors across variants', () => {
		const variants = { type: ['note', 'warning'] };
		const selectors = collectAllSelectors(
			'hint', 'hint', 'rf',
			variants, undefined, undefined,
			(flags) => {
				const base = ['.rf-hint', '.rf-hint__body'];
				if (flags.type) base.push(`.rf-hint--${flags.type}`);
				return base;
			},
		);
		expect(selectors).toContain('.rf-hint');
		expect(selectors).toContain('.rf-hint--note');
		expect(selectors).toContain('.rf-hint--warning');
		expect(selectors).toContain('.rf-hint__body');
	});

	it('adds context modifier selectors synthetically', () => {
		const selectors = collectAllSelectors(
			'hint', 'hint', 'rf',
			{}, { Hero: 'in-hero', Feature: 'in-feature' }, undefined,
			() => ['.rf-hint', '.rf-hint__body'],
		);
		expect(selectors).toContain('.rf-hint--in-hero');
		expect(selectors).toContain('.rf-hint--in-feature');
	});

	it('adds static modifier selectors synthetically', () => {
		const selectors = collectAllSelectors(
			'tier', 'tier', 'rf',
			{}, undefined, ['featured'],
			() => ['.rf-tier'],
		);
		expect(selectors).toContain('.rf-tier--featured');
	});

	it('deduplicates and sorts selectors', () => {
		const selectors = collectAllSelectors(
			'hint', 'hint', 'rf',
			{ type: ['note', 'warning'] }, undefined, undefined,
			() => ['.rf-hint', '.rf-hint__body', '.rf-hint'],
		);
		// No duplicates
		const unique = new Set(selectors);
		expect(selectors.length).toBe(unique.size);
		// Sorted: blocks first, then modifiers, then elements
		const blockIdx = selectors.indexOf('.rf-hint');
		const elemIdx = selectors.indexOf('.rf-hint__body');
		expect(blockIdx).toBeLessThan(elemIdx);
	});

	it('runs with empty flags when no variants', () => {
		const selectors = collectAllSelectors(
			'grid', 'grid', 'rf',
			{}, undefined, undefined,
			(flags) => {
				expect(Object.keys(flags)).toHaveLength(0);
				return ['.rf-grid'];
			},
		);
		expect(selectors).toEqual(['.rf-grid']);
	});
});
