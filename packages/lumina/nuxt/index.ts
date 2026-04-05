import type { AdapterTheme } from '@refrakt-md/transform';
import manifest from '../manifest.json';
import { defaultLayout, docsLayout, blogArticleLayout } from '@refrakt-md/transform';

// Layout region metadata from the base theme manifest
const layoutRegions: Record<string, { regions: string[]; requiredRegions?: string[] }> = {
	default: { regions: ['header', 'footer'] },
	docs: { regions: ['header', 'nav', 'sidebar', 'footer'], requiredRegions: ['nav'] },
	'blog-article': { regions: ['header', 'sidebar', 'footer'] },
};

const layouts: Record<string, any> = {};
for (const [name, def] of Object.entries(manifest.layouts)) {
	layouts[name] = { ...layoutRegions[name], ...def };
}

const mergedManifest = { ...manifest, layouts };

export { mergedManifest as manifest };

export const theme: AdapterTheme = {
	manifest: mergedManifest as any,
	layouts: {
		default: defaultLayout,
		docs: docsLayout,
		'blog-article': blogArticleLayout,
	},
};
