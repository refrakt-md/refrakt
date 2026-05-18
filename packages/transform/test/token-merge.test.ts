import { describe, it, expect } from 'vitest';
import type { PartialTokenContract, ThemeTokensConfig } from '@refrakt-md/types';
import { mergeTokenContracts, mergeThemeTokensConfigs } from '../src/token-merge.js';

describe('mergeTokenContracts', () => {
	it('returns an empty object given no layers', () => {
		expect(mergeTokenContracts()).toEqual({});
	});

	it('ignores undefined layers', () => {
		expect(mergeTokenContracts(undefined, undefined)).toEqual({});
	});

	it('returns the single layer unchanged', () => {
		const layer: PartialTokenContract = { color: { primary: '#abc' } };
		expect(mergeTokenContracts(layer)).toEqual(layer);
	});

	it('last-write-wins per leaf', () => {
		const a: PartialTokenContract = { color: { primary: '#aaa', text: '#000' } };
		const b: PartialTokenContract = { color: { primary: '#bbb' } };
		expect(mergeTokenContracts(a, b)).toEqual({
			color: { primary: '#bbb', text: '#000' },
		});
	});

	it('merges nested namespaces independently', () => {
		const a: PartialTokenContract = {
			color: {
				surface: { base: '#fcfaf6', hover: '#efece5' },
			},
		};
		const b: PartialTokenContract = {
			color: {
				surface: { hover: '#cccccc' },
			},
		};
		expect(mergeTokenContracts(a, b)).toEqual({
			color: { surface: { base: '#fcfaf6', hover: '#cccccc' } },
		});
	});

	it('preserves siblings absent from the later layer', () => {
		const a: PartialTokenContract = {
			color: { primary: '#aaa', text: '#000' },
			radius: { sm: '4px' },
		};
		const b: PartialTokenContract = { color: { primary: '#bbb' } };
		expect(mergeTokenContracts(a, b)).toEqual({
			color: { primary: '#bbb', text: '#000' },
			radius: { sm: '4px' },
		});
	});

	it('treats null as a real leaf value (interpreted as reset by stylesheet gen)', () => {
		const a: PartialTokenContract = { color: { primary: '#aaa' } } as PartialTokenContract;
		const b = { color: { primary: null } } as unknown as PartialTokenContract;
		expect(mergeTokenContracts(a, b)).toEqual({ color: { primary: null } });
	});

	it('composes three layers in declared order', () => {
		const base: PartialTokenContract = { color: { primary: '#000', text: '#111' } };
		const preset: PartialTokenContract = { color: { primary: '#222' } };
		const siteOverride: PartialTokenContract = { color: { primary: '#333', muted: '#777' } };
		expect(mergeTokenContracts(base, preset, siteOverride)).toEqual({
			color: { primary: '#333', text: '#111', muted: '#777' },
		});
	});

	it('does not mutate the input layers', () => {
		const a: PartialTokenContract = { color: { primary: '#aaa' } };
		const b: PartialTokenContract = { color: { primary: '#bbb' } };
		const aCopy = structuredClone(a);
		const bCopy = structuredClone(b);
		mergeTokenContracts(a, b);
		expect(a).toEqual(aCopy);
		expect(b).toEqual(bCopy);
	});

	it('walks deep into the syntax namespace', () => {
		const a: PartialTokenContract = {
			syntax: { keyword: '#aaa', function: '#bbb' },
		};
		const b: PartialTokenContract = {
			syntax: { keyword: '#ccc', string: '#ddd' },
		};
		expect(mergeTokenContracts(a, b)).toEqual({
			syntax: { keyword: '#ccc', function: '#bbb', string: '#ddd' },
		});
	});
});

describe('mergeThemeTokensConfigs', () => {
	it('merges base fields and ignores absent modes/extra', () => {
		const a: ThemeTokensConfig = { color: { primary: '#aaa' } };
		const b: ThemeTokensConfig = { color: { primary: '#bbb' } };
		expect(mergeThemeTokensConfigs(a, b)).toEqual({
			color: { primary: '#bbb' },
		});
	});

	it('merges modes independently from base, last-write-wins per mode leaf', () => {
		const a: ThemeTokensConfig = {
			color: { primary: '#aaa' },
			modes: { dark: { color: { primary: '#111' } } },
		};
		const b: ThemeTokensConfig = {
			modes: { dark: { color: { primary: '#222' } } },
		};
		expect(mergeThemeTokensConfigs(a, b)).toEqual({
			color: { primary: '#aaa' },
			modes: { dark: { color: { primary: '#222' } } },
		});
	});

	it('preserves modes only present in one layer', () => {
		const a: ThemeTokensConfig = {
			modes: { dark: { color: { primary: '#111' } } },
		};
		const b: ThemeTokensConfig = {
			modes: { 'high-contrast': { color: { border: '#000' } } },
		};
		expect(mergeThemeTokensConfigs(a, b)).toEqual({
			modes: {
				dark: { color: { primary: '#111' } },
				'high-contrast': { color: { border: '#000' } },
			},
		});
	});

	it('shallow-merges extra (later wins per key)', () => {
		const a: ThemeTokensConfig = { extra: { 'rf-x': 'red', 'rf-y': 'green' } };
		const b: ThemeTokensConfig = { extra: { 'rf-y': 'blue', 'rf-z': 'yellow' } };
		expect(mergeThemeTokensConfigs(a, b)).toEqual({
			extra: { 'rf-x': 'red', 'rf-y': 'blue', 'rf-z': 'yellow' },
		});
	});

	it('demonstrates the full layering order: theme base → preset → site override', () => {
		const themeBase: ThemeTokensConfig = {
			color: { primary: '#1c1a17', bg: '#f6f4ef' },
			modes: { dark: { color: { primary: '#f6f4ef', bg: '#1c1a17' } } },
		};
		const tideline: ThemeTokensConfig = {
			color: { primary: '#1d3557', bg: '#faf5eb' },
			modes: { dark: { color: { primary: '#a8dadc', bg: '#152238' } } },
			extra: { 'rf-tideline-hero-overlay': 'rgba(15, 23, 42, 0.6)' },
		};
		const siteOverride: ThemeTokensConfig = {
			color: { primary: '#7c3aed' },
		};
		const merged = mergeThemeTokensConfigs(themeBase, tideline, siteOverride);

		expect(merged.color?.primary).toBe('#7c3aed');
		expect(merged.color?.bg).toBe('#faf5eb');
		expect(merged.modes?.dark?.color?.primary).toBe('#a8dadc');
		expect(merged.extra?.['rf-tideline-hero-overlay']).toBe('rgba(15, 23, 42, 0.6)');
	});
});
