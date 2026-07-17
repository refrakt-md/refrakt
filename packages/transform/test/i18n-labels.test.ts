import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig, RuneConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const asTag = (n: any): SerializedTag => n as SerializedTag;
const isT = (c: unknown): c is SerializedTag =>
	typeof c === 'object' && c !== null && '$$mdtype' in (c as object);

function findByName(node: SerializedTag, name: string): SerializedTag | undefined {
	for (const child of node.children) {
		if (!isT(child)) continue;
		if (child.attributes['data-name'] === name) return child;
		const found = findByName(child, name);
		if (found) return found;
	}
	return undefined;
}

/** Collect the text of every `[data-meta-label]` span under a node. */
function labelTexts(node: SerializedTag): string[] {
	const out: string[] = [];
	const walk = (n: unknown) => {
		if (!isT(n)) return;
		if ('data-meta-label' in n.attributes) {
			const text = n.children.find(c => typeof c === 'string');
			if (typeof text === 'string') out.push(text);
		}
		// dt carries data-meta-label and its own text child
		n.children.forEach(walk);
	};
	walk(node);
	return out;
}

// A recipe-shaped rune: def-list block with labelled temporal/quantity fields.
const recipeConfig: RuneConfig = {
	block: 'recipe',
	scope: 'learning',
	modifiers: {
		prepTime: { source: 'meta' },
		servings: { source: 'meta' },
	},
	metaFields: {
		prepTime: { metaType: 'temporal', label: 'Prep', condition: 'prepTime' },
		servings: { metaType: 'quantity', label: 'Serves', condition: 'servings' },
	},
	blocks: {
		meta: { fields: ['prepTime', 'servings'], layout: 'definition-list' },
	},
	layout: { root: ['meta', 'body'] },
};

function makeRecipeTag() {
	// The engine kebab-cases modifier names when matching `data-field`
	// (createComponentRenderable emits kebab), so a `prepTime` modifier reads
	// `data-field="prep-time"`.
	return makeTag('article', { 'data-rune': 'recipe' }, [
		makeTag('meta', { 'data-field': 'prep-time', content: '20m' }),
		makeTag('meta', { 'data-field': 'servings', content: '4' }),
		makeTag('div', { 'data-name': 'body' }, [makeTag('p', {}, ['Body'])]),
	]);
}

function baseConfig(extra: Partial<ThemeConfig> = {}): ThemeConfig {
	return { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes: { Recipe: recipeConfig }, ...extra };
}

describe('SPEC-035 Zone 1 — meta-field label localization', () => {
	it('zero-config English output is unchanged', () => {
		const en = createTransform(baseConfig());
		const result = asTag(en(makeRecipeTag()));
		const meta = findByName(result, 'meta')!;
		expect(labelTexts(meta)).toEqual(['Prep', 'Serves']);
	});

	it('renders translated labels via auto-derived {scope}.{block}.{ref} keys', () => {
		const de = createTransform(
			baseConfig({
				locale: 'de',
				strings: {
					'learning.recipe.prepTime': 'Vorbereitung',
					'learning.recipe.servings': 'Portionen',
				},
			}),
		);
		const result = asTag(de(makeRecipeTag()));
		const meta = findByName(result, 'meta')!;
		expect(labelTexts(meta)).toEqual(['Vorbereitung', 'Portionen']);
	});

	it('falls back to English per key when a translation is missing', () => {
		const de = createTransform(
			baseConfig({ locale: 'de', strings: { 'learning.recipe.prepTime': 'Vorbereitung' } }),
		);
		const result = asTag(de(makeRecipeTag()));
		const meta = findByName(result, 'meta')!;
		expect(labelTexts(meta)).toEqual(['Vorbereitung', 'Serves']);
	});

	it('honours an explicit i18nKey override', () => {
		const overrideConfig: RuneConfig = {
			...recipeConfig,
			metaFields: {
				prepTime: { metaType: 'temporal', label: 'Prep', condition: 'prepTime', i18nKey: 'learning.stable.prep' },
				servings: { metaType: 'quantity', label: 'Serves', condition: 'servings' },
			},
		};
		const de = createTransform(
			baseConfig({
				runes: { Recipe: overrideConfig },
				locale: 'de',
				strings: {
					'learning.stable.prep': 'Vorbereitung',
					// The auto-derived key must NOT win when an override is set:
					'learning.recipe.prepTime': 'WRONG',
					'learning.recipe.servings': 'Portionen',
				},
			}),
		);
		const result = asTag(de(makeRecipeTag()));
		const meta = findByName(result, 'meta')!;
		expect(labelTexts(meta)).toEqual(['Vorbereitung', 'Portionen']);
	});

	it('defaults scope to core when a config declares none', () => {
		const coreish: RuneConfig = { ...recipeConfig, scope: undefined };
		const de = createTransform(
			baseConfig({
				runes: { Recipe: coreish },
				locale: 'de',
				strings: { 'core.recipe.prepTime': 'Vorbereitung' },
			}),
		);
		const result = asTag(de(makeRecipeTag()));
		const meta = findByName(result, 'meta')!;
		expect(labelTexts(meta)).toEqual(['Vorbereitung', 'Serves']);
	});
});
