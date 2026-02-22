import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import postcss from 'postcss';
import { baseConfig } from '@refrakt-md/theme-base';
import type { RuneConfig, StructureEntry } from '@refrakt-md/transform';

// ─── Known gaps ───
// Blocks/selectors that intentionally lack CSS. Keeping them documented here
// means the test suite stays green while still catching regressions.
// Remove entries as CSS is added.

const UNSTYLED_BLOCKS = new Set([
	'recipe-ingredient', // styled inline within recipe.css (no own block selector)
	'music-playlist',    // not yet implemented
	'music-recording',   // not yet implemented
	'tab',               // interactive-only, styled by Svelte component
]);

const KNOWN_MISSING_SELECTORS = new Set([
	'.rf-event__end-date',   // end-date span styled via parent date detail
	'.rf-hero--in-feature',  // context modifier not yet styled
]);

// ─── Helpers ───

const CSS_DIR = join(__dirname, '..', 'styles', 'runes');

/** Parse all CSS files and collect every .rf-* class selector */
function parseAllCssSelectors(): Set<string> {
	const selectors = new Set<string>();
	const files = readdirSync(CSS_DIR).filter(f => f.endsWith('.css'));

	for (const file of files) {
		const css = readFileSync(join(CSS_DIR, file), 'utf-8');
		const root = postcss.parse(css);
		root.walkRules(rule => {
			const matches = rule.selector.matchAll(/\.rf-[\w-]+/g);
			for (const m of matches) {
				selectors.add(m[0]);
			}
		});
	}

	return selectors;
}

/** Recursively collect data-name refs from a structure entry */
function collectStructureRefs(entry: StructureEntry, key: string): string[] {
	const refs: string[] = [];
	const name = entry.ref ?? key;
	if (name) refs.push(name);

	if (entry.children) {
		for (const child of entry.children) {
			if (typeof child !== 'string' && child.ref) {
				refs.push(...collectStructureRefs(child, child.ref));
			}
		}
	}
	return refs;
}

/** Compute expected selectors for a rune from its config */
function expectedSelectors(prefix: string, config: RuneConfig): string[] {
	const block = `${prefix}-${config.block}`;
	const selectors: string[] = [`.${block}`];

	// Context modifier selectors
	if (config.contextModifiers) {
		for (const suffix of Object.values(config.contextModifiers)) {
			selectors.push(`.${block}--${suffix}`);
		}
	}

	// Static modifier selectors
	if (config.staticModifiers) {
		for (const mod of config.staticModifiers) {
			selectors.push(`.${block}--${mod}`);
		}
	}

	// Structure element selectors
	if (config.structure) {
		for (const [key, entry] of Object.entries(config.structure)) {
			const refs = collectStructureRefs(entry, key);
			for (const ref of refs) {
				selectors.push(`.${block}__${ref}`);
			}
		}
	}

	// Content wrapper selector
	if (config.contentWrapper) {
		selectors.push(`.${block}__${config.contentWrapper.ref}`);
	}

	// AutoLabel selectors
	if (config.autoLabel) {
		for (const label of Object.values(config.autoLabel)) {
			selectors.push(`.${block}__${label}`);
		}
	}

	return [...new Set(selectors)].sort();
}

// ─── Test data ───

const allCssSelectors = parseAllCssSelectors();
const { prefix, runes } = baseConfig;

// Build test entries: [runeName, blockName, config]
const runeEntries = Object.entries(runes).map(
	([name, config]) => [name, config.block, config] as [string, string, RuneConfig]
);

// Filter to runes that should have CSS (not in known-unstyled set)
const styledRuneEntries = runeEntries.filter(([, block]) => !UNSTYLED_BLOCKS.has(block));

// Runes with structural elements
const structuralRunes = styledRuneEntries.filter(
	([,, config]) => config.structure || config.contentWrapper || config.autoLabel
);

// Runes with context modifiers
const contextRunes = styledRuneEntries.filter(
	([,, config]) => config.contextModifiers && Object.keys(config.contextModifiers).length > 0
);

// Runes with static modifiers
const staticRunes = styledRuneEntries.filter(
	([,, config]) => config.staticModifiers && config.staticModifiers.length > 0
);

// ─── Tests ───

describe('Lumina CSS coverage', () => {
	describe('block selector coverage', () => {
		it.each(styledRuneEntries)(
			'%s (.rf-%s) has block selector in CSS',
			(_name, block, _config) => {
				const selector = `.${prefix}-${block}`;
				expect(allCssSelectors.has(selector), `Missing CSS for ${selector}`).toBe(true);
			}
		);
	});

	describe('structural element selectors', () => {
		it.each(structuralRunes)(
			'%s has all element selectors styled',
			(name, _block, config) => {
				const expected = expectedSelectors(prefix, config);
				const elementSelectors = expected.filter(s => s.includes('__'));
				const missing = elementSelectors.filter(
					s => !allCssSelectors.has(s) && !KNOWN_MISSING_SELECTORS.has(s)
				);

				expect(missing, `${name}: missing element selectors`).toEqual([]);
			}
		);
	});

	describe('context modifier selectors', () => {
		it.each(contextRunes)(
			'%s has all context modifier selectors styled',
			(_name, _block, config) => {
				const block = `${prefix}-${config.block}`;
				const expected = Object.values(config.contextModifiers!).map(
					suffix => `.${block}--${suffix}`
				);
				const missing = expected.filter(
					s => !allCssSelectors.has(s) && !KNOWN_MISSING_SELECTORS.has(s)
				);

				expect(missing, `Missing context modifier selectors`).toEqual([]);
			}
		);
	});

	describe('static modifier selectors', () => {
		it.each(staticRunes)(
			'%s has all static modifier selectors styled',
			(_name, _block, config) => {
				const block = `${prefix}-${config.block}`;
				const expected = config.staticModifiers!.map(mod => `.${block}--${mod}`);
				const missing = expected.filter(
					s => !allCssSelectors.has(s) && !KNOWN_MISSING_SELECTORS.has(s)
				);

				expect(missing, `Missing static modifier selectors`).toEqual([]);
			}
		);
	});

	describe('coverage summary', () => {
		it('overall block coverage meets threshold', () => {
			const allBlocks = [...new Set(Object.values(runes).map(c => c.block))];
			const styledBlocks = allBlocks.filter(block => allCssSelectors.has(`.${prefix}-${block}`));
			const unstyledBlocks = allBlocks.filter(block => !allCssSelectors.has(`.${prefix}-${block}`));
			const pct = Math.round((styledBlocks.length / allBlocks.length) * 100);

			// Log for visibility
			if (unstyledBlocks.length > 0) {
				console.log(`\nBlocks without CSS: ${unstyledBlocks.join(', ')}`);
			}
			console.log(`CSS coverage: ${styledBlocks.length}/${allBlocks.length} blocks (${pct}%)`);

			expect(pct).toBeGreaterThanOrEqual(90);
		});

		it('known unstyled blocks are documented', () => {
			// Ensure UNSTYLED_BLOCKS doesn't contain blocks that now HAVE CSS
			// (i.e., remove entries from the set when CSS is added)
			const nowStyled = [...UNSTYLED_BLOCKS].filter(
				block => allCssSelectors.has(`.${prefix}-${block}`)
			);
			expect(
				nowStyled,
				`These blocks now have CSS — remove from UNSTYLED_BLOCKS: ${nowStyled.join(', ')}`
			).toEqual([]);
		});

		it('known missing selectors are still actually missing', () => {
			// Ensure KNOWN_MISSING_SELECTORS doesn't contain selectors that now exist
			const nowPresent = [...KNOWN_MISSING_SELECTORS].filter(
				s => allCssSelectors.has(s)
			);
			expect(
				nowPresent,
				`These selectors now have CSS — remove from KNOWN_MISSING_SELECTORS: ${nowPresent.join(', ')}`
			).toEqual([]);
		});
	});
});
