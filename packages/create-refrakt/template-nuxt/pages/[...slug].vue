<script setup lang="ts">
import { loadContent } from '@refrakt-md/content';
import { createTransform } from '@refrakt-md/transform';
import { baseConfig } from '@refrakt-md/runes';
import manifest from '@refrakt-md/lumina/manifest';
import { layouts } from '@refrakt-md/lumina/layouts';
const theme = { manifest, layouts };
import { renderPage, buildRefraktHead } from '@refrakt-md/nuxt';
import type { RendererNode } from '@refrakt-md/types';

const route = useRoute();

const { data } = await useAsyncData('refrakt-' + route.path, async () => {
	const site = await loadContent('./content', '/');
	const transform = createTransform(baseConfig);

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
	};
});

if (data.value?.seo) {
	useHead({
		title: data.value.seo.title,
		meta: data.value.seo.meta,
		script: data.value.seo.script,
	});
}
</script>

<template>
	<div v-if="data" v-html="data.html" />
</template>
