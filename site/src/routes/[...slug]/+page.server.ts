import { loadContent } from '@refrakt-md/content';
import { serialize, serializeTree } from '@refrakt-md/svelte';
import { luminaConfig } from '@refrakt-md/lumina/transform';
import { createHighlightTransform } from '@refrakt-md/highlight';
import type { HighlightTransform } from '@refrakt-md/highlight';
import { loadRunePackage, mergePackages, runes as coreRunes } from '@refrakt-md/runes';
import { assembleThemeConfig, createTransform } from '@refrakt-md/transform';
import type { Schema } from '@markdoc/markdoc';
import { error } from '@sveltejs/kit';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import type { PageServerLoad } from './$types';
import type { RefraktConfig } from '@refrakt-md/types';

const config: RefraktConfig = JSON.parse(readFileSync(path.resolve('refrakt.config.json'), 'utf-8'));
const contentDir = path.resolve(config.contentDir);
const icons = {
	...luminaConfig.icons,
	global: { ...luminaConfig.icons.global, ...(config.icons ?? {}) },
};

let _hl: HighlightTransform | null = null;

async function getHighlightTransform(): Promise<HighlightTransform> {
	const cached = _hl;
	if (cached) return cached;
	const hl = await createHighlightTransform(config.highlight);
	_hl = hl;
	return hl;
}

let _communityTags: Record<string, Schema> | undefined;
let _transform: ((tree: any) => any) | null = null;

async function getTransform(): Promise<(tree: any) => any> {
	if (_transform) return _transform;

	const packageNames = config.packages ?? [];
	if (packageNames.length === 0) {
		_transform = createTransform(luminaConfig);
		return _transform;
	}

	const loaded = await Promise.all(
		packageNames.map((name: string) => loadRunePackage(name))
	);
	const coreRuneNames = new Set(Object.keys(coreRunes));
	const merged = mergePackages(loaded, coreRuneNames, config.runes?.prefer);

	_communityTags = Object.keys(merged.tags).length > 0 ? merged.tags : undefined;

	const { config: assembledConfig } = assembleThemeConfig({
		coreConfig: luminaConfig,
		packageRunes: merged.themeRunes,
		packageIcons: merged.themeIcons,
		extensions: merged.extensions,
		provenance: merged.provenance,
	});

	_transform = createTransform(assembledConfig);
	return _transform;
}

async function getCommunityTags(): Promise<Record<string, Schema> | undefined> {
	await getTransform();
	return _communityTags;
}

export const prerender = true;

export const load: PageServerLoad = async ({ params }) => {
	const [transform, communityTags, hl] = await Promise.all([
		getTransform(),
		getCommunityTags(),
		getHighlightTransform(),
	]);

	const site = await loadContent(contentDir, '/', icons, communityTags);
	const slug = params.slug || '';
	const url = '/' + slug;

	const page = site.pages.find(p => p.route.url === url);

	if (!page || page.route.draft) {
		error(404, 'Page not found');
	}

	const serialized = serializeTree(page.renderable);
	const renderable = hl(transform(serialized));

	return {
		title: page.frontmatter.title ?? '',
		description: page.frontmatter.description ?? '',
		frontmatter: page.frontmatter,
		renderable,
		regions: Object.fromEntries(
			[...page.layout.regions.entries()].map(([name, region]) => [
				name,
				{ name: region.name, mode: region.mode, content: region.content.map(c => hl(transform(serialize(c)))) }
			])
		),
		seo: page.seo,
		url,
		headings: page.headings,
		highlightCss: hl.css,
	};
};

export async function entries() {
	const communityTags = await getCommunityTags();
	const site = await loadContent(contentDir, '/', icons, communityTags);
	return site.pages
		.filter(p => !p.route.draft)
		.map(p => ({ slug: p.route.url === '/' ? '' : p.route.url.slice(1) }));
}
