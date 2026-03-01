import { describe, it, expect } from 'vitest';
import { mergeThemeConfig, applyRuneExtensions } from '../src/merge.js';
import type { ThemeConfig, RuneConfig } from '@refrakt-md/transform';

function makeBaseConfig(): ThemeConfig {
	return {
		prefix: 'rf',
		tokenPrefix: '--rf',
		icons: {
			hint: { note: '<svg>note</svg>', warning: '<svg>warning</svg>' },
		},
		runes: {
			Hint: {
				block: 'hint',
				modifiers: { hintType: { source: 'meta', default: 'note' } },
			},
			Character: {
				block: 'character',
				modifiers: { role: { source: 'meta' } },
				structure: {
					header: { tag: 'header', ref: 'header', before: true },
				},
			},
		},
	};
}

describe('mergeThemeConfig', () => {
	it('merges community rune configs as new entries', () => {
		const base = makeBaseConfig();
		const result = mergeThemeConfig(base, {
			runes: {
				GameItem: { block: 'game-item' },
			},
		});

		expect(result.runes['GameItem']).toEqual({ block: 'game-item' });
		expect(result.runes['Hint']).toBeDefined();
		expect(result.runes['Character']).toBeDefined();
	});

	it('merges community icons', () => {
		const base = makeBaseConfig();
		const result = mergeThemeConfig(base, {
			icons: {
				'game-item': { common: '<svg>common</svg>' },
			},
		});

		expect(result.icons['game-item']).toEqual({ common: '<svg>common</svg>' });
		expect(result.icons['hint']).toBeDefined();
	});
});

describe('applyRuneExtensions', () => {
	it('adds modifiers to existing rune config', () => {
		const base = makeBaseConfig();
		const result = applyRuneExtensions(base, {
			Character: {
				modifiers: {
					class: { source: 'attribute' as const },
					level: { source: 'attribute' as const },
				},
			},
		});

		expect(result.runes['Character'].modifiers?.role).toBeDefined();
		expect(result.runes['Character'].modifiers?.class).toEqual({ source: 'attribute' });
		expect(result.runes['Character'].modifiers?.level).toEqual({ source: 'attribute' });
	});

	it('adds structure entries to existing rune config', () => {
		const base = makeBaseConfig();
		const result = applyRuneExtensions(base, {
			Character: {
				structure: {
					statsBar: {
						tag: 'div',
						ref: 'stats-bar',
						condition: 'class',
					},
				},
			},
		});

		expect(result.runes['Character'].structure?.header).toBeDefined();
		expect(result.runes['Character'].structure?.statsBar).toBeDefined();
		expect(result.runes['Character'].structure?.statsBar.tag).toBe('div');
	});

	it('does not modify runes not in config', () => {
		const base = makeBaseConfig();
		const result = applyRuneExtensions(base, {
			NonExistent: {
				modifiers: { foo: { source: 'meta' as const } },
			},
		});

		expect(result.runes['NonExistent']).toBeUndefined();
		expect(result.runes['Hint']).toBeDefined();
	});

	it('preserves original config immutably', () => {
		const base = makeBaseConfig();
		const originalModifiers = { ...base.runes['Character'].modifiers };

		applyRuneExtensions(base, {
			Character: {
				modifiers: { class: { source: 'attribute' as const } },
			},
		});

		// Original should be unchanged
		expect(base.runes['Character'].modifiers).toEqual(originalModifiers);
	});

	it('handles empty extensions', () => {
		const base = makeBaseConfig();
		const result = applyRuneExtensions(base, {});

		expect(result.runes).toEqual(base.runes);
	});
});
