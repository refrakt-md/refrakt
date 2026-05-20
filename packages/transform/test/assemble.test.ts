import { describe, it, expect } from 'vitest';
import { assembleThemeConfig } from '../src/assemble.js';
import type { ThemeConfig } from '../src/types.js';
import type { RuneConfig } from '../src/types.js';
import type { RuneProvenance } from '../src/provenance.js';

const coreConfig: ThemeConfig = {
	prefix: 'rf',
	tokenPrefix: 'rf',
	icons: {
		hint: { note: '<svg>note</svg>', warning: '<svg>warn</svg>' },
	},
	runes: {
		Hint: { block: 'hint', modifiers: { type: { source: 'meta', default: 'note' } } },
		TabGroup: { block: 'tabs' },
		Steps: { block: 'steps' },
	},
};

describe('assembleThemeConfig', () => {
	it('returns core config unchanged when no overrides', () => {
		const result = assembleThemeConfig({ coreConfig });

		expect(result.config).toEqual(coreConfig);
		expect(result.provenance['Hint']).toEqual({ qualifiedId: 'core:Hint', source: 'core' });
		expect(result.provenance['TabGroup']).toEqual({ qualifiedId: 'core:TabGroup', source: 'core' });
		expect(result.provenance['Steps']).toEqual({ qualifiedId: 'core:Steps', source: 'core' });
	});

	it('merges package rune configs', () => {
		const pluginRunes: Record<string, RuneConfig> = {
			Hero: { block: 'hero' },
		};

		const result = assembleThemeConfig({ coreConfig, pluginRunes });

		expect(result.config.runes['Hero']).toEqual({ block: 'hero' });
		expect(result.config.runes['Hint']).toEqual(coreConfig.runes['Hint']); // core untouched
	});

	it('merges package icons', () => {
		const pluginIcons = {
			hero: { default: '<svg>hero</svg>' },
		};

		const result = assembleThemeConfig({ coreConfig, pluginIcons });

		expect(result.config.icons['hero']).toEqual({ default: '<svg>hero</svg>' });
		expect(result.config.icons['hint']).toEqual(coreConfig.icons['hint']); // core untouched
	});

	it('applies theme overrides on top of packages', () => {
		const pluginRunes: Record<string, RuneConfig> = {
			Hero: { block: 'hero' },
		};
		const themeOverrides = {
			icons: { hint: { note: '<svg>themed-note</svg>' } },
		};

		const result = assembleThemeConfig({ coreConfig, pluginRunes, themeOverrides });

		expect(result.config.runes['Hero']).toEqual({ block: 'hero' });
		expect(result.config.icons['hint']).toEqual({ note: '<svg>themed-note</svg>' });
	});

	it('applies extensions additively', () => {
		const extensions = {
			Hint: {
				modifiers: { severity: { source: 'meta' as const } },
			},
		};

		const result = assembleThemeConfig({ coreConfig, extensions });

		expect(result.config.runes['Hint'].modifiers).toEqual({
			type: { source: 'meta', default: 'note' },
			severity: { source: 'meta' },
		});
	});

	it('preserves and enriches provenance from packages', () => {
		const packageProvenance: Record<string, RuneProvenance> = {
			Hero: { qualifiedId: 'marketing:Hero', source: 'plugin', pluginName: 'marketing', origin: '@refrakt-md/marketing' },
		};
		const pluginRunes: Record<string, RuneConfig> = {
			Hero: { block: 'hero' },
		};

		const result = assembleThemeConfig({
			coreConfig,
			pluginRunes,
			provenance: packageProvenance,
		});

		// Package provenance passed through
		expect(result.provenance['Hero']).toEqual(packageProvenance['Hero']);
		// Core runes get provenance added
		expect(result.provenance['Hint']).toEqual({ qualifiedId: 'core:Hint', source: 'core' });
	});

	it('handles full three-layer merge correctly', () => {
		const pluginRunes: Record<string, RuneConfig> = {
			Hero: { block: 'hero' },
			Cta: { block: 'cta' },
		};
		const pluginIcons = {
			hero: { default: '<svg>pkg-hero</svg>' },
		};
		const themeOverrides = {
			icons: { hero: { default: '<svg>theme-hero</svg>' } },
			runes: { Hint: { block: 'hint' } as Partial<RuneConfig> },
		};
		const extensions = {
			Hint: { modifiers: { extra: { source: 'meta' as const } } },
		};

		const result = assembleThemeConfig({
			coreConfig,
			pluginRunes,
			pluginIcons,
			themeOverrides,
			extensions,
		});

		// Package runes present
		expect(result.config.runes['Hero']).toBeDefined();
		expect(result.config.runes['Cta']).toBeDefined();
		// Theme icon overrides package icon
		expect(result.config.icons['hero']).toEqual({ default: '<svg>theme-hero</svg>' });
		// Extension added to core rune
		expect(result.config.runes['Hint'].modifiers?.extra).toEqual({ source: 'meta' });
	});

	it('handles empty optional inputs', () => {
		const result = assembleThemeConfig({
			coreConfig,
			pluginRunes: {},
			pluginIcons: {},
			extensions: {},
			provenance: {},
		});

		expect(result.config).toEqual(coreConfig);
	});

	it('projects preset-extending tint chrome accents via presetMap', () => {
		// SPEC-056: when site-level tints reference a preset module path,
		// `assembleThemeConfig` must thread the presetMap into
		// resolveTintExtends so the engine sees `light`/`dark` TintTokens on
		// the resolved tint — that's what enables inline `--tint-*` styles
		// (required by `tint-mode` overrides in `tint.css`).
		const presetMap = {
			'@example/preset-warm': {
				color: {
					bg: '#fef3c7',
					text: '#1c1a17',
					primary: '#9c5a18',
					muted: '#9b9692',
					border: '#e0d4b5',
				},
				modes: {
					dark: {
						color: {
							bg: '#2a2018',
							text: '#f6f4ef',
							primary: '#d4a85a',
						},
					},
				},
			},
		};

		const result = assembleThemeConfig({
			coreConfig,
			themeOverrides: {
				tints: {
					warm: { extends: '@example/preset-warm' },
				},
			},
			presetMap,
		});

		const warm = result.config.tints?.warm;
		expect(warm?.extends).toBeUndefined();
		expect(warm?.light).toEqual({
			bg: '#fef3c7',
			text: '#1c1a17',
			primary: '#9c5a18',
			muted: '#9b9692',
			border: '#e0d4b5',
		});
		expect(warm?.dark).toEqual({
			bg: '#2a2018',
			text: '#f6f4ef',
			primary: '#d4a85a',
		});
	});

	it('throws on preset-extending tint when presetMap is missing', () => {
		// Defensive: without presetMap, resolveTintExtends falls through to
		// tint-name lookup and a preset-path extends never matches a tint.
		// The thrown error is what alerts callers (loaders, SvelteKit plugin)
		// that they need to plumb a presetMap through.
		expect(() =>
			assembleThemeConfig({
				coreConfig,
				themeOverrides: {
					tints: {
						warm: { extends: '@example/preset-warm' },
					},
				},
			}),
		).toThrow(/extends unknown tint/);
	});
});
