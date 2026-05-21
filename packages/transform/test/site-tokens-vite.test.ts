import { describe, it, expect } from 'vitest';
import {
	createSiteTokensVitePlugin,
	SITE_TOKENS_VIRTUAL_ID,
} from '../src/site-tokens-vite.js';
import type { SiteConfig } from '@refrakt-md/types';

describe('createSiteTokensVitePlugin', () => {
	const minimalSite: SiteConfig = {
		contentDir: './content',
		theme: '@refrakt-md/lumina',
	};

	it('returns a plugin with the canonical name', () => {
		const plugin = createSiteTokensVitePlugin(minimalSite, '/tmp/test');
		expect(plugin.name).toBe('refrakt-md:site-tokens');
	});

	it('resolves the virtual id to its null-byte form', () => {
		const plugin = createSiteTokensVitePlugin(minimalSite, '/tmp/test');
		const resolved = plugin.resolveId?.(SITE_TOKENS_VIRTUAL_ID);
		expect(resolved).toBe(`\0${SITE_TOKENS_VIRTUAL_ID}`);
	});

	it('does not resolve unrelated module IDs', () => {
		const plugin = createSiteTokensVitePlugin(minimalSite, '/tmp/test');
		expect(plugin.resolveId?.('virtual:something-else')).toBeUndefined();
		expect(plugin.resolveId?.('vite/client')).toBeUndefined();
	});

	it('returns empty CSS for a site with no token overrides', async () => {
		const plugin = createSiteTokensVitePlugin(minimalSite, '/tmp/test');
		await plugin.buildStart?.();
		const css = plugin.load?.(`\0${SITE_TOKENS_VIRTUAL_ID}`);
		expect(css).toBe('');
	});

	it('does not load unrelated module IDs', async () => {
		const plugin = createSiteTokensVitePlugin(minimalSite, '/tmp/test');
		await plugin.buildStart?.();
		expect(plugin.load?.('virtual:other')).toBeUndefined();
		expect(plugin.load?.(SITE_TOKENS_VIRTUAL_ID)).toBeUndefined();
	});

	it('returns CSS containing :root declarations when inline tokens are present', async () => {
		const site: SiteConfig = {
			contentDir: './content',
			theme: {
				package: '@refrakt-md/lumina',
				tokens: { color: { text: '#ff0000' } },
			},
		};
		const plugin = createSiteTokensVitePlugin(site, '/tmp/test');
		await plugin.buildStart?.();
		const css = plugin.load?.(`\0${SITE_TOKENS_VIRTUAL_ID}`);
		expect(css).toContain(':root');
		expect(css).toContain('--rf-color-text');
		expect(css).toContain('#ff0000');
	});
});
