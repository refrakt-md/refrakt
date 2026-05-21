import { loadContent } from '@refrakt-md/content';
import { assembleThemeConfig, createTransform } from '@refrakt-md/transform';
import { loadRefraktConfig, resolveSite } from '@refrakt-md/transform/node';
import { loadPlugin, mergePlugins, runes as coreRunes } from '@refrakt-md/runes';
import { getThemePackage } from '@refrakt-md/types';
import manifest from '@refrakt-md/lumina/manifest';
import { layouts } from '@refrakt-md/lumina/layouts';
const theme = { manifest, layouts };
import { RefraktContent, buildMetadata, buildJsonLd, buildUrlFromParams, hasInteractiveRunes } from '@refrakt-md/next';
import { BehaviorInit } from '@refrakt-md/next/client';
import type { RendererNode } from '@refrakt-md/types';
import type { Schema } from '@markdoc/markdoc';
import * as path from 'node:path';

const config = loadRefraktConfig(path.resolve('refrakt.config.json'));
const { site } = resolveSite(config);
const contentDir = path.resolve(site.contentDir);

// Site-level SEO fields surfaced into buildMetadata + buildJsonLd.
const seoSite = {
	siteName: site.siteName,
	baseUrl: site.baseUrl,
	defaultImage: site.defaultImage,
	logo: site.logo,
};

async function getTransformAndTags() {
	const themePackage = getThemePackage(site.theme);
	const themeModule = await import(themePackage + '/transform');
	const themeConfig = themeModule.themeConfig ?? themeModule.luminaConfig ?? themeModule.default;

	const pluginNames = site.plugins ?? [];
	if (pluginNames.length === 0) {
		return { transform: createTransform(themeConfig), communityTags: undefined };
	}

	const loaded = await Promise.all(
		pluginNames.map((name: string) => loadPlugin(name))
	);
	const coreRuneNames = new Set(Object.keys(coreRunes));
	const merged = mergePlugins(loaded, coreRuneNames, site.runes?.prefer);

	const communityTags: Record<string, Schema> | undefined =
		Object.keys(merged.tags).length > 0 ? merged.tags : undefined;

	const { config: assembledConfig } = assembleThemeConfig({
		coreConfig: themeConfig,
		pluginRunes: merged.themeRunes,
		pluginIcons: merged.themeIcons,
		pluginBackgrounds: merged.themeBackgrounds,
		extensions: merged.extensions as any,
		provenance: merged.provenance,
	});

	return { transform: createTransform(assembledConfig), communityTags };
}

let _cached: Awaited<ReturnType<typeof getTransformAndTags>> | null = null;
async function getCached() {
	if (!_cached) _cached = await getTransformAndTags();
	return _cached;
}

export async function generateStaticParams() {
	const { communityTags } = await getCached();
	const site = await loadContent(contentDir, '/', {}, communityTags);
	return site.pages
		.filter((p: any) => !p.route.draft)
		.map((page: any) => ({
			slug: page.route.url === '/' ? [] : page.route.url.slice(1).split('/'),
		}));
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }) {
	const resolvedParams = await params;
	const url = buildUrlFromParams(resolvedParams);
	const { communityTags } = await getCached();
	const site = await loadContent(contentDir, '/', {}, communityTags);
	const page = site.pages.find((p: any) => p.route.url === url);
	if (!page) return {};

	return buildMetadata({
		title: (page.frontmatter.title as string) ?? '',
		frontmatter: page.frontmatter,
		seo: page.seo,
		...seoSite,
	});
}

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
	const resolvedParams = await params;
	const url = buildUrlFromParams(resolvedParams);
	const { transform, communityTags } = await getCached();
	const site = await loadContent(contentDir, '/', {}, communityTags);
	const currentPage = site.pages.find((p: any) => p.route.url === url);
	if (!currentPage) return <div>Page not found</div>;

	const renderable = transform(currentPage.renderable) as RendererNode;

	const regions: Record<string, any> = {};
	for (const [name, region] of currentPage.layout.regions.entries()) {
		regions[name] = {
			name: region.name,
			mode: region.mode,
			content: region.content.map((c: any) => transform(c) as RendererNode),
		};
	}

	const pages = site.pages
		.filter((p: any) => !p.route.draft)
		.map((p: any) => ({
			url: p.route.url,
			title: (p.frontmatter.title as string) ?? '',
			draft: false,
		}));

	const page = {
		renderable,
		regions,
		title: (currentPage.frontmatter.title as string) ?? '',
		url: currentPage.route.url,
		pages,
		frontmatter: currentPage.frontmatter,
		headings: currentPage.headings,
	};

	const needsBehaviors = hasInteractiveRunes(page.renderable);

	return (
		<>
			<RefraktContent theme={theme} page={page} />
			{needsBehaviors && <BehaviorInit pages={pages} currentUrl={page.url} />}
		</>
	);
}
