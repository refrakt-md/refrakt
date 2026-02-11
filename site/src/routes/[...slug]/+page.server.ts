import { loadContent } from '@refract-md/content';
import { Tag } from '@markdoc/markdoc';
import type { RenderableTreeNode, RenderableTreeNodes } from '@markdoc/markdoc';
import { error } from '@sveltejs/kit';
import * as path from 'node:path';
import type { PageServerLoad } from './$types';

const contentDir = path.resolve('content');

export const prerender = true;

/** Convert Markdoc Tag instances to plain serializable objects */
function serialize(node: RenderableTreeNode): unknown {
	if (node === null || node === undefined) return node;
	if (typeof node === 'string' || typeof node === 'number') return node;
	if (Tag.isTag(node)) {
		return {
			$$mdtype: 'Tag',
			name: node.name,
			attributes: node.attributes,
			children: node.children.map(serialize),
		};
	}
	return node;
}

function serializeTree(tree: RenderableTreeNodes): unknown {
	if (Array.isArray(tree)) return tree.map(serialize);
	return serialize(tree);
}

export const load: PageServerLoad = async ({ params }) => {
	const site = await loadContent(contentDir);
	const slug = params.slug || '';
	const url = '/' + slug;

	const page = site.pages.find(p => p.route.url === url);

	if (!page || page.route.draft) {
		error(404, 'Page not found');
	}

	return {
		title: page.frontmatter.title ?? '',
		description: page.frontmatter.description ?? '',
		renderable: serializeTree(page.renderable),
		regions: Object.fromEntries(
			[...page.layout.regions.entries()].map(([name, region]) => [
				name,
				{ name: region.name, mode: region.mode, content: region.content.map(serialize) }
			])
		),
	};
};

export async function entries() {
	const site = await loadContent(contentDir);
	return site.pages
		.filter(p => !p.route.draft)
		.map(p => ({ slug: p.route.url === '/' ? '' : p.route.url.slice(1) }));
}
