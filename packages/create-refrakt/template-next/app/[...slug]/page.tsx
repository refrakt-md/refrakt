import { loadContent } from '@refrakt-md/content';
import { createTransform } from '@refrakt-md/transform';
import { baseConfig } from '@refrakt-md/runes';
import { theme } from '@refrakt-md/lumina/next';
import { RefraktContent, buildMetadata, buildUrlFromParams, hasInteractiveRunes } from '@refrakt-md/next';
import { BehaviorInit } from '@refrakt-md/next/client';
import type { RendererNode } from '@refrakt-md/types';

export async function generateStaticParams() {
	const site = await loadContent('./content', '/');
	return site.pages
		.filter((p: any) => !p.route.draft)
		.map((page: any) => ({
			slug: page.route.url === '/' ? [] : page.route.url.slice(1).split('/'),
		}));
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }) {
	const resolvedParams = await params;
	const url = buildUrlFromParams(resolvedParams);
	const site = await loadContent('./content', '/');
	const page = site.pages.find((p: any) => p.route.url === url);
	if (!page) return {};

	return buildMetadata({
		title: (page.frontmatter.title as string) ?? '',
		frontmatter: page.frontmatter,
		seo: page.seo,
	});
}

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
	const resolvedParams = await params;
	const url = buildUrlFromParams(resolvedParams);
	const site = await loadContent('./content', '/');
	const currentPage = site.pages.find((p: any) => p.route.url === url);
	if (!currentPage) return <div>Page not found</div>;

	const transform = createTransform(baseConfig);
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
