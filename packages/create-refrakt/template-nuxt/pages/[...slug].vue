<script setup lang="ts">
import '@refrakt-md/lumina';
import { loadContent } from '@refrakt-md/content';
import { assembleThemeConfig, createTransform } from '@refrakt-md/transform';
import { loadRunePackage, mergePackages, runes as coreRunes } from '@refrakt-md/runes';
import manifest from '@refrakt-md/lumina/manifest';
import { layouts } from '@refrakt-md/lumina/layouts';
const theme = { manifest, layouts };
import { renderPage, buildRefraktHead, hasInteractiveRunes } from '@refrakt-md/nuxt';
import { useBehaviors } from '@refrakt-md/nuxt/client';
import type { RendererNode } from '@refrakt-md/types';
import type { RefraktConfig } from '@refrakt-md/types';
import type { Schema } from '@markdoc/markdoc';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const config: RefraktConfig = JSON.parse(readFileSync(path.resolve('refrakt.config.json'), 'utf-8'));
const contentDir = path.resolve(config.contentDir);

const themeModule = await import(config.theme + '/transform');
const themeConfig = themeModule.themeConfig ?? themeModule.luminaConfig ?? themeModule.default;

let transformConfig = themeConfig;
let communityTags: Record<string, Schema> | undefined;

const packageNames = config.packages ?? [];
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

	transformConfig = assembledConfig;
}

const transform = createTransform(transformConfig);

const route = useRoute();

const { data } = await useAsyncData('refrakt-' + route.path, async () => {
	const site = await loadContent(contentDir, '/', {}, communityTags);

	const currentPage = site.pages.find((p: any) => p.route.url === route.path);
	if (!currentPage) throw createError({ statusCode: 404, message: 'Page not found' });

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

	return {
		html: renderPage({
			theme,
			page: {
				renderable,
				regions,
				title: (currentPage.frontmatter.title as string) ?? '',
				url: currentPage.route.url,
				pages,
				frontmatter: currentPage.frontmatter,
				headings: currentPage.headings,
			},
		}),
		seo: buildRefraktHead({
			title: (currentPage.frontmatter.title as string) ?? '',
			frontmatter: currentPage.frontmatter,
			seo: currentPage.seo,
		}),
		pages,
	};
});

if (data.value?.seo) {
	useHead({
		title: data.value.seo.title,
		meta: data.value.seo.meta,
		script: data.value.seo.script,
	});
}

// Initialize interactive rune behaviors on the client
if (data.value?.pages) {
	useBehaviors({ pages: data.value.pages, currentUrl: route.path });
}
</script>

<template>
	<div v-if="data" v-html="data.html" />
</template>
