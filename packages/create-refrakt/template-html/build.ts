import { loadContent, buildHighlightOptions, analyzeRuneUsage } from '@refrakt-md/content';
import {
	renderFullPage,
	composeSiteTokensCss,
	computeUsedCssBlocks,
	buildUsedCssImports,
} from '@refrakt-md/html';
import type { HtmlTheme } from '@refrakt-md/html';
import { assembleThemeConfig, createTransform, defaultLayout } from '@refrakt-md/transform';
import { loadRefraktConfig, resolveSite } from '@refrakt-md/transform/node';
import { createHighlightTransform } from '@refrakt-md/highlight';
import { loadPlugin, mergePlugins, runes as coreRunes } from '@refrakt-md/runes';
import { getThemePackage } from '@refrakt-md/types';
import type { RendererNode } from '@refrakt-md/types';
import type { Schema } from '@markdoc/markdoc';
import { mkdirSync, writeFileSync, cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

// --- Configuration -------------------------------------------------------

const configPath = path.resolve('refrakt.config.json');
const config = loadRefraktConfig(configPath);
const { site } = resolveSite(config);
const contentDir = path.resolve(site.contentDir);
const configDir = path.dirname(configPath);
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
	const themePackage = getThemePackage(site.theme);
	// Load theme config — replace this import if using a custom theme
	const themeModule = await import(themePackage + '/transform');
	const themeConfig = themeModule.themeConfig ?? themeModule.luminaConfig ?? themeModule.default;

	const icons = {
		...themeConfig.icons,
		global: { ...(themeConfig.icons?.global ?? {}), ...(site.icons ?? {}) },
	};

	// Load plugins — site-scoped first, top-level fallback for legacy configs
	const pluginNames = site.plugins ?? config.plugins ?? [];
	let communityTags: Record<string, Schema> | undefined;
	let finalConfig = themeConfig;

	if (pluginNames.length > 0) {
		const loaded = await Promise.all(
			pluginNames.map((name: string) => loadPlugin(name))
		);
		const coreRuneNames = new Set(Object.keys(coreRunes));
		const merged = mergePlugins(loaded, coreRuneNames, site.runes?.prefer);

		communityTags = Object.keys(merged.tags).length > 0 ? merged.tags : undefined;

		const { config: assembledConfig } = assembleThemeConfig({
			coreConfig: themeConfig,
			pluginRunes: merged.themeRunes,
			pluginIcons: merged.themeIcons,
			pluginBackgrounds: merged.themeBackgrounds,
			extensions: merged.extensions as any,
			provenance: merged.provenance,
		});

		if (site.tints) {
			assembledConfig.tints = { ...assembledConfig.tints, ...site.tints };
		}
		if (site.backgrounds) {
			assembledConfig.backgrounds = { ...assembledConfig.backgrounds, ...site.backgrounds };
		}

		finalConfig = assembledConfig;
	}

	// Create identity transform from theme config
	const transform = createTransform(finalConfig);

	// Create highlight transform
	const hl = await createHighlightTransform(buildHighlightOptions(site));

	// Compose site-level token overrides CSS (SPEC-048 + SPEC-056).
	// Empty string when the site has no overrides; safe to inline either way.
	const siteTokensCss = await composeSiteTokensCss(site, configDir);

	// Build theme object for HTML adapter
	const themeManifestModule = await import(themePackage + '/manifest', { with: { type: 'json' } });
	const manifest = themeManifestModule.default;

	const theme: HtmlTheme = {
		manifest: {
			...manifest,
			routeRules: site.routeRules ?? manifest.routeRules ?? [],
		},
		layouts: {
			default: defaultLayout,
		},
	};

	// Load content
	const loadedSite = await loadContent(contentDir, '/', icons, communityTags);

	mkdirSync(outDir, { recursive: true });

	// Tree-shake per-rune CSS: only ship blocks that actually appear in the
	// page corpus. Falls back to the theme barrel if analysis fails.
	const usageReport = analyzeRuneUsage(loadedSite.pages);
	let stylesheets: string[];
	let blocksToCopy: { src: string; dest: string }[] = [];
	try {
		const { usedBlocks, stylesDir } = await computeUsedCssBlocks(
			usageReport.allTypes,
			finalConfig,
			themePackage,
		);
		const themeEntryUrl = import.meta.resolve(themePackage);
		const themeDir = path.dirname(fileURLToPath(themeEntryUrl));
		stylesheets = ['/base.css'];
		blocksToCopy.push({
			src: path.join(themeDir, 'base.css'),
			dest: path.join(outDir, 'base.css'),
		});
		for (const block of [...usedBlocks].sort()) {
			stylesheets.push(`/styles/runes/${block}.css`);
			blocksToCopy.push({
				src: path.join(stylesDir, `${block}.css`),
				dest: path.join(outDir, 'styles', 'runes', `${block}.css`),
			});
		}
	} catch (err) {
		console.warn(
			`Tree-shaking skipped (${(err as Error).message}); shipping full theme barrel.`,
		);
		stylesheets = ['/styles.css'];
	}

	// Collect page metadata for navigation
	const pages = loadedSite.pages
		.filter(p => !p.route.draft)
		.map(p => ({
			url: p.route.url,
			title: (p.frontmatter.title as string) ?? '',
			draft: p.route.draft,
		}));

	let count = 0;

	for (const page of loadedSite.pages) {
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
				stylesheets,
				// Order matters: highlight CSS first, site-tokens CSS second so
				// site-level `--rf-*` overrides resolve last in the cascade.
				headExtra:
					(hl.css ? `<style>${hl.css}</style>` : '') +
					(siteTokensCss ? `<style>${siteTokensCss}</style>` : ''),
				seo: page.seo,
				baseUrl: site.baseUrl,
				siteName: site.siteName,
				defaultImage: site.defaultImage,
				logo: site.logo,
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

	// Copy the per-rune CSS files (or the theme barrel as fallback)
	if (blocksToCopy.length > 0) {
		for (const { src, dest } of blocksToCopy) {
			if (existsSync(src)) {
				mkdirSync(path.dirname(dest), { recursive: true });
				cpSync(src, dest);
			}
		}
	} else {
		try {
			const themePkg = themePackage;
			const themeDir = path.dirname(require.resolve(themePkg + '/package.json'));
			const cssPath = path.join(themeDir, 'index.css');
			if (existsSync(cssPath)) {
				cpSync(cssPath, path.join(outDir, 'styles.css'));
			}
		} catch {
			console.warn(
				'Warning: Could not copy theme CSS. Add a styles.css to the build directory manually.',
			);
		}
	}

	console.log(`Built ${count} pages to ${outDir}/`);
}

build().catch(err => {
	console.error(err);
	process.exit(1);
});
