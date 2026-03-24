import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import postcss from 'postcss';
import { baseConfig } from '@refrakt-md/runes';
import type { RuneConfig, StructureEntry, ThemeConfig } from '@refrakt-md/transform';
import marketing from '@refrakt-md/marketing';
import docs from '@refrakt-md/docs';
import storytelling from '@refrakt-md/storytelling';
import places from '@refrakt-md/places';
import business from '@refrakt-md/business';
import design from '@refrakt-md/design';
import learning from '@refrakt-md/learning';
import media from '@refrakt-md/media';

// ─── Known gaps ───
// Blocks/selectors that intentionally lack CSS. Keeping them documented here
// means the test suite stays green while still catching regressions.
// Remove entries as CSS is added.

const UNSTYLED_BLOCKS = new Set([
	'recipe-ingredient', // styled inline within recipe.css (no own block selector)
	'tint',              // directive rune — applies CSS custom props to parent, no own visual
	'bg',                // directive rune — sets parent backdrop, no own visual
	'region',            // structural rune — layout region container, no own visual
	'definition',        // child of feature — styled inline within feature.css
]);

const KNOWN_MISSING_SELECTORS = new Set([
	'.rf-event__end-date',   // end-date span styled via parent date detail
	'.rf-hero--in-feature',  // context modifier not yet styled
	// pageSectionAutoLabel selectors — page section header elements inherited from section system
	'.rf-testimonial__quote',
	'.rf-comparison__header', '.rf-comparison__eyebrow', '.rf-comparison__headline', '.rf-comparison__blurb', '.rf-comparison__image',
	'.rf-symbol__eyebrow', '.rf-symbol__headline', '.rf-symbol__blurb', '.rf-symbol__image',
	'.rf-changelog__header', '.rf-changelog__eyebrow', '.rf-changelog__headline', '.rf-changelog__blurb', '.rf-changelog__image',
	'.rf-blog__content', '.rf-blog__eyebrow', '.rf-blog__image',
	'.rf-howto__header', '.rf-howto__eyebrow', '.rf-howto__headline', '.rf-howto__blurb', '.rf-howto__image',
	'.rf-itinerary__header', '.rf-itinerary__eyebrow', '.rf-itinerary__headline', '.rf-itinerary__blurb', '.rf-itinerary__image',
	'.rf-cast__header', '.rf-cast__eyebrow', '.rf-cast__headline', '.rf-cast__blurb', '.rf-cast__image',
	'.rf-organization__header', '.rf-organization__eyebrow', '.rf-organization__headline', '.rf-organization__blurb', '.rf-organization__image',
	'.rf-timeline__header', '.rf-timeline__eyebrow', '.rf-timeline__headline', '.rf-timeline__blurb', '.rf-timeline__image',
	'.rf-event__header', '.rf-event__eyebrow', '.rf-event__headline', '.rf-event__blurb', '.rf-event__image',
	'.rf-preview__header', '.rf-preview__eyebrow', '.rf-preview__headline', '.rf-preview__blurb', '.rf-preview__image',
]);

// ─── Helpers ───

const CSS_DIR = join(__dirname, '..', 'styles', 'runes');
const DIMENSIONS_DIR = join(__dirname, '..', 'styles', 'dimensions');

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

/** Parse all CSS files in the dimensions directory and collect attribute selectors */
function parseDimensionSelectors(): Set<string> {
	const selectors = new Set<string>();
	if (!readdirSync(DIMENSIONS_DIR, { withFileTypes: true }).length) return selectors;

	const files = readdirSync(DIMENSIONS_DIR).filter(f => f.endsWith('.css'));
	for (const file of files) {
		const css = readFileSync(join(DIMENSIONS_DIR, file), 'utf-8');
		const root = postcss.parse(css);
		root.walkRules(rule => {
			const matches = rule.selector.matchAll(/\[data-meta-[\w-]+(?:="[\w-]+")?]/g);
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

// ─── Assemble full config (core + all rune packages) ───

const fullRunes: Record<string, RuneConfig> = {
	...baseConfig.runes,
	...marketing.theme?.runes as Record<string, RuneConfig>,
	...docs.theme?.runes as Record<string, RuneConfig>,
	...storytelling.theme?.runes as Record<string, RuneConfig>,
	...places.theme?.runes as Record<string, RuneConfig>,
	...business.theme?.runes as Record<string, RuneConfig>,
	...design.theme?.runes as Record<string, RuneConfig>,
	...learning.theme?.runes as Record<string, RuneConfig>,
	...media.theme?.runes as Record<string, RuneConfig>,
};

const fullConfig: ThemeConfig = { ...baseConfig, runes: fullRunes };

// ─── Test data ───

const allCssSelectors = parseAllCssSelectors();
const { prefix } = fullConfig;
const runes = fullRunes;

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

	describe('metadata dimension selectors', () => {
		const dimensionSelectors = parseDimensionSelectors();

		const META_TYPES = ['status', 'category', 'quantity', 'temporal', 'tag', 'id'] as const;
		const SENTIMENTS = ['positive', 'negative', 'caution', 'neutral'] as const;
		const RANKS = ['primary', 'secondary'] as const;

		it.each(META_TYPES)(
			'meta type "%s" has CSS rule',
			(type) => {
				expect(
					dimensionSelectors.has(`[data-meta-type="${type}"]`),
					`Missing CSS for [data-meta-type="${type}"]`
				).toBe(true);
			}
		);

		it.each(SENTIMENTS)(
			'sentiment "%s" has CSS rule',
			(sentiment) => {
				expect(
					dimensionSelectors.has(`[data-meta-sentiment="${sentiment}"]`),
					`Missing CSS for [data-meta-sentiment="${sentiment}"]`
				).toBe(true);
			}
		);

		it.each(RANKS)(
			'rank "%s" has CSS rule',
			(rank) => {
				expect(
					dimensionSelectors.has(`[data-meta-rank="${rank}"]`),
					`Missing CSS for [data-meta-rank="${rank}"]`
				).toBe(true);
			}
		);
	});
});
