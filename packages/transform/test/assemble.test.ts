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
		const packageRunes: Record<string, RuneConfig> = {
			Hero: { block: 'hero' },
		};

		const result = assembleThemeConfig({ coreConfig, packageRunes });

		expect(result.config.runes['Hero']).toEqual({ block: 'hero' });
		expect(result.config.runes['Hint']).toEqual(coreConfig.runes['Hint']); // core untouched
	});

	it('merges package icons', () => {
		const packageIcons = {
			hero: { default: '<svg>hero</svg>' },
		};

		const result = assembleThemeConfig({ coreConfig, packageIcons });

		expect(result.config.icons['hero']).toEqual({ default: '<svg>hero</svg>' });
		expect(result.config.icons['hint']).toEqual(coreConfig.icons['hint']); // core untouched
	});

	it('applies theme overrides on top of packages', () => {
		const packageRunes: Record<string, RuneConfig> = {
			Hero: { block: 'hero' },
		};
		const themeOverrides = {
			icons: { hint: { note: '<svg>themed-note</svg>' } },
		};

		const result = assembleThemeConfig({ coreConfig, packageRunes, themeOverrides });

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
			Hero: { qualifiedId: 'marketing:Hero', source: 'package', packageName: 'marketing', origin: '@refrakt-md/marketing' },
		};
		const packageRunes: Record<string, RuneConfig> = {
			Hero: { block: 'hero' },
		};

		const result = assembleThemeConfig({
			coreConfig,
			packageRunes,
			provenance: packageProvenance,
		});

		// Package provenance passed through
		expect(result.provenance['Hero']).toEqual(packageProvenance['Hero']);
		// Core runes get provenance added
		expect(result.provenance['Hint']).toEqual({ qualifiedId: 'core:Hint', source: 'core' });
	});

	it('handles full three-layer merge correctly', () => {
		const packageRunes: Record<string, RuneConfig> = {
			Hero: { block: 'hero' },
			Cta: { block: 'cta' },
		};
		const packageIcons = {
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
			packageRunes,
			packageIcons,
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
			packageRunes: {},
			packageIcons: {},
			extensions: {},
			provenance: {},
		});

		expect(result.config).toEqual(coreConfig);
	});
});
