import { getSite } from '$lib/content';
import type { ResolvedTintCascade } from '@refrakt-md/content';

const DEFAULT_CASCADE: ResolvedTintCascade = {
	tint: null,
	tintMode: 'auto',
	locked: false,
};

export async function load({ url }) {
	const site = await getSite();
	const currentPage = site.pages.find(p => p.route.url === url.pathname);
	// Per-route cascade ships to the client so +layout.svelte can re-apply
	// the SSR-equivalent <html> attributes on client-side navigation —
	// SvelteKit reuses the same <html> across nav so attrs set by the
	// theme toggle on an unlocked page would otherwise leak into the next
	// locked page.
	const tintCascade: ResolvedTintCascade = currentPage?.tintCascade ?? DEFAULT_CASCADE;

	return {
		tintCascade,
		pages: site.pages.map(p => ({
			url: p.route.url,
			title: p.frontmatter.title ?? '',
			draft: p.route.draft,
			description: p.frontmatter.description,
			date: p.frontmatter.date,
			author: p.frontmatter.author,
			tags: p.frontmatter.tags,
			image: p.frontmatter.image,
			version: p.frontmatter.version as string | undefined,
			versionGroup: p.frontmatter.versionGroup as string | undefined,
		})),
	};
}
