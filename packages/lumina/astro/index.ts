import type { AstroTheme } from '@refrakt-md/astro';
import adapterManifest from './manifest.json';
import { defaultLayout, docsLayout, blogArticleLayout } from '@refrakt-md/theme-base';

// Layout region metadata from the base theme manifest (packages/lumina/manifest.json).
// Merged with adapter manifest entries to produce full LayoutDefinitions.
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

/** Re-export the merged manifest for server-side use */
export { manifest };

/** The structured theme object consumed by Astro pages */
export const theme: AstroTheme = {
	manifest: manifest as any,
	layouts: {
		default: defaultLayout,
		docs: docsLayout,
		'blog-article': blogArticleLayout,
	},
};
