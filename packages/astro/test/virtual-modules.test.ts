import { describe, it, expect } from 'vitest';
import { resolveVirtualId, loadVirtualModule, VIRTUAL_IDS } from '../src/virtual-modules.js';

describe('resolveVirtualId', () => {
	it('resolves virtual:refrakt/theme', () => {
		expect(resolveVirtualId(VIRTUAL_IDS.theme)).toBe('\0virtual:refrakt/theme');
	});

	it('resolves virtual:refrakt/tokens', () => {
		expect(resolveVirtualId(VIRTUAL_IDS.tokens)).toBe('\0virtual:refrakt/tokens');
	});

	it('resolves virtual:refrakt/config', () => {
		expect(resolveVirtualId(VIRTUAL_IDS.config)).toBe('\0virtual:refrakt/config');
	});

	it('returns undefined for unrelated module IDs', () => {
		expect(resolveVirtualId('astro')).toBeUndefined();
		expect(resolveVirtualId('./some-file.js')).toBeUndefined();
		expect(resolveVirtualId('@refrakt-md/astro')).toBeUndefined();
	});

	it('returns undefined for partial matches', () => {
		expect(resolveVirtualId('virtual:refrakt/other')).toBeUndefined();
		expect(resolveVirtualId('virtual:refrakt/')).toBeUndefined();
	});
});

describe('loadVirtualModule', () => {
	const config = {
		contentDir: './content',
		theme: '@refrakt-md/lumina',
		target: 'astro',
	};

	it('generates theme import from astro adapter', () => {
		const result = loadVirtualModule('\0virtual:refrakt/theme', config);
		expect(result).toContain("import { theme as _base } from '@refrakt-md/lumina/astro';");
	});

	it('injects routeRules from config', () => {
		const result = loadVirtualModule('\0virtual:refrakt/theme', config);
		expect(result).toContain('routeRules:');
		// Default fallback when no routeRules in config
		expect(result).toContain('"**"');
		expect(result).toContain('"default"');
	});

	it('injects site config routeRules into theme', () => {
		const configWithRules = {
			...config,
			routeRules: [
				{ pattern: 'docs/**', layout: 'docs' },
				{ pattern: '**', layout: 'default' },
			],
		};
		const result = loadVirtualModule('\0virtual:refrakt/theme', configWithRules);
		expect(result).toContain('"docs/**"');
		expect(result).toContain('"docs"');
	});

	it('generates tokens CSS import from astro adapter', () => {
		const result = loadVirtualModule('\0virtual:refrakt/tokens', config);
		expect(result).toBe("import '@refrakt-md/lumina/astro/tokens.css';");
	});

	it('generates tree-shaken CSS imports during build', () => {
		const result = loadVirtualModule('\0virtual:refrakt/tokens', config, {
			isBuild: true,
			usedCssBlocks: new Set(['hint', 'accordion']),
		});
		expect(result).toContain("import '@refrakt-md/lumina/base.css';");
		expect(result).toContain("import '@refrakt-md/lumina/styles/runes/accordion.css';");
		expect(result).toContain("import '@refrakt-md/lumina/styles/runes/hint.css';");
	});

	it('generates config export', () => {
		const result = loadVirtualModule('\0virtual:refrakt/config', config);
		expect(result).toContain('export default');
		const parsed = JSON.parse(result!.replace('export default ', '').replace(';', ''));
		expect(parsed).toEqual(config);
	});

	it('returns undefined for unrecognized resolved IDs', () => {
		expect(loadVirtualModule('\0virtual:refrakt/other', config)).toBeUndefined();
		expect(loadVirtualModule('some-random-id', config)).toBeUndefined();
	});

	it('works with different theme package names', () => {
		const customConfig = { ...config, theme: '@refrakt-md/aurora' };
		expect(loadVirtualModule('\0virtual:refrakt/theme', customConfig))
			.toContain("import { theme as _base } from '@refrakt-md/aurora/astro';");
		expect(loadVirtualModule('\0virtual:refrakt/tokens', customConfig))
			.toBe("import '@refrakt-md/aurora/astro/tokens.css';");
	});

	it('generates theme with component overrides', () => {
		const configWithOverrides = {
			...config,
			overrides: {
				'Chart': './components/CustomChart.astro',
			},
		};
		const result = loadVirtualModule('\0virtual:refrakt/theme', configWithOverrides);
		expect(result).toContain("import _o0 from './components/CustomChart.astro';");
		expect(result).toContain("'Chart': _o0,");
	});
});
