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
		expect(resolveVirtualId('svelte')).toBeUndefined();
		expect(resolveVirtualId('./some-file.js')).toBeUndefined();
		expect(resolveVirtualId('@refrakt-md/svelte')).toBeUndefined();
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
		target: 'svelte',
	};

	it('generates theme by assembling manifest + layouts + framework defaults (ADR-009)', () => {
		const result = loadVirtualModule('\0virtual:refrakt/theme', config);
		expect(result).toContain("import _manifest from '@refrakt-md/lumina/manifest';");
		expect(result).toContain("import { layouts as _layouts } from '@refrakt-md/lumina/layouts';");
		expect(result).toContain("import { registry as _registry } from '@refrakt-md/svelte';");
		expect(result).toContain("import { elements as _elements } from '@refrakt-md/svelte';");
		expect(result).toContain('routeRules:');
		// Default fallback when no routeRules in config
		expect(result).toContain('"**"');
		expect(result).toContain('"default"');
		expect(result).toContain('layouts: _layouts,');
		expect(result).toContain('components: _registry,');
		expect(result).toContain('elements: _elements,');
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

	it('generates tokens CSS import from theme root export', () => {
		const result = loadVirtualModule('\0virtual:refrakt/tokens', config);
		expect(result).toContain("import '@refrakt-md/lumina';");
		// Site-level token overrides (SPEC-048) are always wired through the
		// virtual `site-tokens.css` module — empty if no overrides configured.
		expect(result).toContain("import 'virtual:refrakt/site-tokens.css';");
	});

	// WORK-436 / SPEC-094 §3 — the `@layer skeleton, skin;` order declaration must
	// be emitted before any layer content; importing the skeleton entry first
	// guarantees it loader-agnostically. The skeleton import must precede the
	// theme CSS in both dev and build modes.
	it('imports @refrakt-md/skeleton before the theme CSS (dev mode)', () => {
		const result = loadVirtualModule('\0virtual:refrakt/tokens', config)!;
		const skeletonAt = result.indexOf("import '@refrakt-md/skeleton';");
		const themeAt = result.indexOf("import '@refrakt-md/lumina';");
		expect(skeletonAt).toBeGreaterThanOrEqual(0);
		expect(themeAt).toBeGreaterThan(skeletonAt);
	});

	it('imports @refrakt-md/skeleton before any tree-shaken theme CSS (build mode)', () => {
		const result = loadVirtualModule('\0virtual:refrakt/tokens', config, {
			isBuild: true,
			resolvedRoot: '',
			usedCssBlocks: new Set(['card', 'hint']),
		})!;
		const skeletonAt = result.indexOf("import '@refrakt-md/skeleton';");
		const baseAt = result.indexOf("import '@refrakt-md/lumina/base.css';");
		const runeAt = result.indexOf("import '@refrakt-md/lumina/styles/runes/card.css';");
		expect(skeletonAt).toBeGreaterThanOrEqual(0);
		expect(baseAt).toBeGreaterThan(skeletonAt);
		expect(runeAt).toBeGreaterThan(skeletonAt);
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
			.toContain("import _manifest from '@refrakt-md/aurora/manifest';");
		expect(loadVirtualModule('\0virtual:refrakt/theme', customConfig))
			.toContain("import { layouts as _layouts } from '@refrakt-md/aurora/layouts';");
		expect(loadVirtualModule('\0virtual:refrakt/tokens', customConfig))
			.toContain("import '@refrakt-md/aurora';");
	});
});
