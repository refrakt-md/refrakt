import { loadContent } from '@refrakt-md/content';
import { renderFullPage } from '@refrakt-md/html';
import type { HtmlTheme } from '@refrakt-md/html';
import { assembleThemeConfig, createTransform, defaultLayout } from '@refrakt-md/transform';
import { createHighlightTransform } from '@refrakt-md/highlight';
import { loadRunePackage, mergePackages, runes as coreRunes } from '@refrakt-md/runes';
import type { RendererNode } from '@refrakt-md/types';
import type { Schema } from '@markdoc/markdoc';
import { readFileSync, mkdirSync, writeFileSync, cpSync, existsSync } from 'node:fs';
import * as path from 'node:path';

// --- Configuration -------------------------------------------------------

const config = JSON.parse(readFileSync('refrakt.config.json', 'utf-8'));
const contentDir = path.resolve(config.contentDir);
const outDir = 'build';

// --- Helpers --------------------------------------------------------------

/** Convert Markdoc Tag class instances to plain objects. */
function serialize(node: any): any {
	if (node === null || node === undefined) return node;
	if (typeof node === 'string' || typeof node === 'number') return node;
	if (Array.isArray(node)) return node.map(serialize);
	if (node.$$mdtype === 'Tag') {
		return {
			$$mdtype: 'Tag',
			name: node.name,
			attributes: node.attributes,
			children: (node.children ?? []).map(serialize),
		};
	}
	return node;
}

// --- Build ----------------------------------------------------------------

async function build() {
	// Load theme config — replace this import if using a custom theme
	const themeModule = await import(config.theme + '/transform');
	const themeConfig = themeModule.themeConfig ?? themeModule.luminaConfig ?? themeModule.default;

	const icons = {
		...themeConfig.icons,
		global: { ...(themeConfig.icons?.global ?? {}), ...(config.icons ?? {}) },
	};

	// Load community packages
	const packageNames = config.packages ?? [];
	let communityTags: Record<string, Schema> | undefined;
	let finalConfig = themeConfig;

	if (packageNames.length > 0) {
		const loaded = await Promise.all(
			packageNames.map((name: string) => loadRunePackage(name))
		);
		const coreRuneNames = new Set(Object.keys(coreRunes));
		const merged = mergePackages(loaded, coreRuneNames, config.runes?.prefer);

		communityTags = Object.keys(merged.tags).length > 0 ? merged.tags : undefined;

		const { config: assembledConfig } = assembleThemeConfig({
			coreConfig: themeConfig,
			packageRunes: merged.themeRunes,
			packageIcons: merged.themeIcons,
			packageBackgrounds: merged.themeBackgrounds,
			extensions: merged.extensions as any,
			provenance: merged.provenance,
		});

		if (config.tints) {
			assembledConfig.tints = { ...assembledConfig.tints, ...config.tints };
		}
		if (config.backgrounds) {
			assembledConfig.backgrounds = { ...assembledConfig.backgrounds, ...config.backgrounds };
		}

		finalConfig = assembledConfig;
	}

	// Create identity transform from theme config
	const transform = createTransform(finalConfig);

	// Create highlight transform
	const hl = await createHighlightTransform(config.highlight);

	// Build theme object for HTML adapter
	const themeManifestModule = await import(config.theme + '/manifest', { with: { type: 'json' } });
	const manifest = themeManifestModule.default;

	const theme: HtmlTheme = {
		manifest: {
			...manifest,
			routeRules: config.routeRules ?? manifest.routeRules ?? [],
		},
		layouts: {
			default: defaultLayout,
		},
	};

	// Load content
	const site = await loadContent(contentDir, '/', icons, communityTags);

	mkdirSync(outDir, { recursive: true });

	// Collect page metadata for navigation
	const pages = site.pages
		.filter(p => !p.route.draft)
		.map(p => ({
			url: p.route.url,
			title: (p.frontmatter.title as string) ?? '',
			draft: p.route.draft,
		}));

	let count = 0;

	for (const page of site.pages) {
		if (page.route.draft) continue;

		// Serialize → identity transform → highlight
		const renderable = hl(transform(serialize(page.renderable))) as RendererNode;

		// Process regions the same way
		const regions: Record<string, { name: string; mode: string; content: RendererNode[] }> = {};
		for (const [name, region] of page.layout.regions.entries()) {
			regions[name] = {
				name: region.name,
				mode: region.mode,
				content: region.content.map(c => hl(transform(serialize(c))) as RendererNode),
			};
		}

		const html = renderFullPage(
			{
				theme,
				page: {
					renderable,
					regions,
					title: (page.frontmatter.title as string) ?? '',
					url: page.route.url,
					pages,
					frontmatter: page.frontmatter,
				},
			},
			{
				stylesheets: ['/styles.css'],
				headExtra: hl.css ? `<style>${hl.css}</style>` : '',
				seo: page.seo,
			},
		);

		// Write to build/{path}/index.html
		const filePath = page.route.url === '/'
			? path.join(outDir, 'index.html')
			: path.join(outDir, page.route.url.slice(1), 'index.html');

		mkdirSync(path.dirname(filePath), { recursive: true });
		writeFileSync(filePath, html);
		count++;
	}

	// Copy theme CSS to build directory
	try {
		const themePkg = config.theme;
		const themeDir = path.dirname(require.resolve(themePkg + '/package.json'));
		const cssPath = path.join(themeDir, 'index.css');
		if (existsSync(cssPath)) {
			cpSync(cssPath, path.join(outDir, 'styles.css'));
		}
	} catch {
		console.warn('Warning: Could not copy theme CSS. Add a styles.css to the build directory manually.');
	}

	console.log(`Built ${count} pages to ${outDir}/`);
}

build().catch(err => {
	console.error(err);
	process.exit(1);
});
