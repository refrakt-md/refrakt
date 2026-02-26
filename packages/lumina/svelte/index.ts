import type { SvelteTheme } from '@refrakt-md/svelte';
import adapterManifest from './manifest.json';
import { registry } from './registry.js';
import { elements } from './elements.js';
import { defaultLayout, docsLayout, blogArticleLayout } from '@refrakt-md/theme-base';

// Layout region metadata from the base theme manifest (packages/lumina/manifest.json).
// Merged with adapter manifest component paths to produce full LayoutDefinitions.
const layoutRegions: Record<string, { regions: string[]; requiredRegions?: string[] }> = {
	default: { regions: ['header', 'footer'] },
	docs: { regions: ['header', 'nav', 'sidebar', 'footer'], requiredRegions: ['nav'] },
	'blog-article': { regions: ['header', 'sidebar', 'footer'] },
};

const layouts: Record<string, any> = {};
for (const [name, adapter] of Object.entries(adapterManifest.layouts)) {
	layouts[name] = { ...layoutRegions[name], ...adapter };
}

const manifest = { ...adapterManifest, layouts };

/** Re-export the merged manifest for server-side use (no Svelte imports) */
export { manifest };

/** The structured theme object consumed by ThemeShell */
export const theme: SvelteTheme = {
	manifest: manifest as any,
	layouts: {
		default: defaultLayout,
		docs: docsLayout,
		'blog-article': blogArticleLayout,
	},
	components: registry,
	elements,
};

// Backward-compatible named exports
export { registry };
export { default as DocsLayout } from './layouts/DocsLayout.svelte';
export { default as DefaultLayout } from './layouts/DefaultLayout.svelte';
export { default as BlogLayout } from './layouts/BlogLayout.svelte';
