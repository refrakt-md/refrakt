import Markdoc from '@markdoc/markdoc';
import type { PackagePipelineHooks } from '@refrakt-md/types';

const { Tag } = Markdoc;

interface BlogPostData {
	title: string;
	url: string;
	date: string;
	description: string;
	draft: boolean;
	frontmatter: Record<string, unknown>;
}

function walkTags(node: unknown, fn: (tag: InstanceType<typeof Tag>) => void): void {
	if (Markdoc.Tag.isTag(node)) {
		fn(node);
		for (const child of node.children) walkTags(child, fn);
	} else if (Array.isArray(node)) {
		node.forEach(n => walkTags(n, fn));
	}
}

function mapTags(node: unknown, fn: (tag: InstanceType<typeof Tag>) => unknown): unknown {
	if (Markdoc.Tag.isTag(node)) {
		const mapped = fn(node);
		if (mapped !== node) return mapped;
		const newChildren = node.children.map(c => mapTags(c, fn));
		const changed = newChildren.some((c, i) => c !== node.children[i]);
		return changed ? new Tag(node.name, node.attributes, newChildren as any[]) : node;
	}
	if (Array.isArray(node)) return node.map(n => mapTags(n, fn));
	return node;
}

/** Normalise folder path for prefix matching: ensure leading slash and trailing slash */
function normaliseFolderPath(folder: string): string {
	let f = folder.trim();
	if (!f.startsWith('/')) f = '/' + f;
	if (!f.endsWith('/')) f += '/';
	return f;
}

/** Check if a page URL is a direct child of the given folder */
function isInFolder(pageUrl: string, folder: string): boolean {
	if (!pageUrl.startsWith(folder)) return false;
	// Must be a direct child (not a deeper nested page)
	const rest = pageUrl.slice(folder.length);
	// rest should be something like "my-post/" (one segment, possibly empty)
	const segments = rest.replace(/\/$/, '').split('/').filter(Boolean);
	return segments.length === 1;
}

/** Parse a simple filter expression like "tag:javascript" into field/value pairs */
function parseFilter(filter: string): Array<{ field: string; value: string }> {
	if (!filter || !filter.trim()) return [];
	return filter.split(',').map(part => {
		const colonIdx = part.indexOf(':');
		if (colonIdx === -1) return { field: part.trim(), value: '' };
		return {
			field: part.slice(0, colonIdx).trim(),
			value: part.slice(colonIdx + 1).trim(),
		};
	});
}

/** Check if a post's frontmatter matches all filter conditions */
function matchesFilter(post: BlogPostData, filters: Array<{ field: string; value: string }>): boolean {
	for (const { field, value } of filters) {
		const fmValue = post.frontmatter[field];
		if (value === '') {
			// Field existence check
			if (fmValue === undefined || fmValue === null) return false;
		} else if (Array.isArray(fmValue)) {
			// Array membership check (e.g. tags)
			if (!fmValue.some(v => String(v).toLowerCase() === value.toLowerCase())) return false;
		} else {
			if (String(fmValue ?? '').toLowerCase() !== value.toLowerCase()) return false;
		}
	}
	return true;
}

/** Sort posts by the specified order */
function sortPosts(posts: BlogPostData[], sort: string): BlogPostData[] {
	const sorted = [...posts];
	switch (sort) {
		case 'date-asc':
			sorted.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
			break;
		case 'title-asc':
			sorted.sort((a, b) => a.title.localeCompare(b.title));
			break;
		case 'title-desc':
			sorted.sort((a, b) => b.title.localeCompare(a.title));
			break;
		case 'date-desc':
		default:
			sorted.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
			break;
	}
	return sorted;
}

/** Build an <article> Tag for a single blog post entry */
function createPostTag(post: BlogPostData): InstanceType<typeof Tag> {
	const titleTag = new Tag('h3', {}, [
		new Tag('a', { href: post.url }, [post.title]),
	]);

	const children: any[] = [titleTag];

	if (post.date) {
		children.push(new Tag('time', { datetime: post.date }, [post.date]));
	}

	if (post.description) {
		children.push(new Tag('p', {}, [post.description]));
	}

	return new Tag('article', { 'data-name': 'post' }, children);
}

export const blogPipelineHooks: PackagePipelineHooks = {
	/**
	 * Phase 2 — Register blog posts.
	 * We use the core 'page' entity type already registered by corePipelineHooks.
	 * No additional registration needed — pages are already indexed.
	 */
	register() {
		// Blog relies on the core 'page' entities — no extra registration needed.
	},

	/**
	 * Phase 3 — Aggregate.
	 * Collect all page entities into a lookup we can use during post-processing.
	 */
	aggregate(registry) {
		const pages = registry.getAll('page');
		const allPosts: BlogPostData[] = [];

		for (const entity of pages) {
			allPosts.push({
				title: entity.data.title as string || '',
				url: entity.data.url as string || entity.id,
				date: entity.data.date as string || '',
				description: entity.data.description as string || '',
				draft: entity.data.draft as boolean || false,
				frontmatter: entity.data as Record<string, unknown>,
			});
		}

		return { allPosts };
	},

	/**
	 * Phase 4 — Post-process.
	 * Find blog runes in the page's renderable tree and inject matching posts.
	 */
	postProcess(page, aggregated, ctx) {
		const blogData = aggregated['blog'] as { allPosts: BlogPostData[] } | undefined;
		if (!blogData?.allPosts) return page;

		let modified = false;
		const newRenderable = mapTags(page.renderable, (tag) => {
			if (tag.attributes['data-rune'] !== 'blog') return tag;

			// Read attribute meta tags
			const folderMeta = tag.children.find(
				(c: unknown) => Markdoc.Tag.isTag(c) && c.attributes['data-field'] === 'folder',
			);
			const sortMeta = tag.children.find(
				(c: unknown) => Markdoc.Tag.isTag(c) && c.attributes['data-field'] === 'sort',
			);
			const filterMeta = tag.children.find(
				(c: unknown) => Markdoc.Tag.isTag(c) && c.attributes['data-field'] === 'filter',
			);
			const limitMeta = tag.children.find(
				(c: unknown) => Markdoc.Tag.isTag(c) && c.attributes['data-field'] === 'limit',
			);

			const folder = Markdoc.Tag.isTag(folderMeta) ? (folderMeta.attributes.content as string) : '';
			const sort = Markdoc.Tag.isTag(sortMeta) ? (sortMeta.attributes.content as string) : 'date-desc';
			const filterStr = Markdoc.Tag.isTag(filterMeta) ? (filterMeta.attributes.content as string) : '';
			const limitStr = Markdoc.Tag.isTag(limitMeta) ? (limitMeta.attributes.content as string) : '';
			const limit = limitStr ? parseInt(limitStr, 10) : undefined;

			if (!folder) {
				ctx.warn('Blog rune missing folder attribute', page.url);
				return tag;
			}

			const normalised = normaliseFolderPath(folder);
			const filters = parseFilter(filterStr);

			// Filter posts: in folder, not draft, matches filter
			let posts = blogData.allPosts.filter(post => {
				if (post.draft) return false;
				if (!isInFolder(post.url, normalised)) return false;
				if (filters.length > 0 && !matchesFilter(post, filters)) return false;
				return true;
			});

			// Sort
			posts = sortPosts(posts, sort);

			// Limit
			if (limit && limit > 0) {
				posts = posts.slice(0, limit);
			}

			// Find the posts placeholder (data-name="posts")
			const postsContainer = tag.children.find(
				(c: unknown) => Markdoc.Tag.isTag(c) && c.attributes['data-name'] === 'posts',
			);

			if (!Markdoc.Tag.isTag(postsContainer)) return tag;

			// Build post article tags
			const postTags = posts.map(createPostTag);

			modified = true;
			// Replace the empty posts container with one containing the post articles
			const newPostsContainer = new Tag(postsContainer.name, postsContainer.attributes, postTags);
			const newChildren = tag.children.map((c: unknown) =>
				c === postsContainer ? newPostsContainer : c,
			);
			return new Tag(tag.name, tag.attributes, newChildren as any[]);
		});

		if (!modified) return page;
		return { ...page, renderable: newRenderable as typeof page.renderable };
	},
};
