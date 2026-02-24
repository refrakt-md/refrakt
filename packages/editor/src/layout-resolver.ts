import Markdoc from '@markdoc/markdoc';
import { ContentTree, resolveLayouts, Router, parseFrontmatter } from '@refrakt-md/content';
import type { ContentPage } from '@refrakt-md/content';
import { tags, nodes, serializeTree } from '@refrakt-md/runes';
import type { ThemeConfig, RendererNode } from '@refrakt-md/transform';

export interface PagePreviewData {
	renderable: unknown;
	regions: Record<string, { name: string; mode: string; content: unknown[] }>;
	title: string;
	description: string;
	frontmatter: Record<string, unknown>;
	url: string;
	pages: Array<{ url: string; path: string; title: string; draft: boolean }>;
}

/**
 * Resolves layouts and builds complete page data for the Svelte preview runtime.
 * Maintains a ContentTree that can be refreshed when files change.
 */
export class LayoutResolver {
	private tree: ContentTree | null = null;
	private router = new Router('/');
	private pagesList: Array<{ url: string; path: string; title: string; draft: boolean }> = [];

	constructor(
		private contentDir: string,
		private themeConfig: ThemeConfig,
	) {}

	/** Build/refresh the ContentTree (call on startup + after file saves) */
	async refresh(): Promise<void> {
		this.tree = await ContentTree.fromDirectory(this.contentDir);
		this.pagesList = this.buildPagesList();
	}

	/**
	 * Build preview data for a regular page.
	 * Runs the full Markdoc pipeline + layout resolution.
	 */
	buildPreviewData(
		filePath: string,
		rawContent: string,
		identityTransform: (tree: RendererNode) => RendererNode,
		highlightTransform?: (tree: RendererNode) => RendererNode,
	): PagePreviewData {
		const { frontmatter, content } = parseFrontmatter(rawContent);

		// Run Markdoc pipeline on page content
		const ast = Markdoc.parse(content);
		const rendered = Markdoc.transform(ast, {
			tags,
			nodes,
			variables: { __source: content },
		});
		const serialized = serializeTree(rendered) as RendererNode;
		let transformed = identityTransform(serialized);
		if (highlightTransform) transformed = highlightTransform(transformed);

		// Resolve layouts and transform region content
		const regions = this.resolveAndTransformRegions(filePath, identityTransform, highlightTransform);

		// Compute URL for route rule matching
		const url = this.router.filePathToUrl(filePath);

		return {
			renderable: transformed,
			regions,
			title: (frontmatter.title as string) ?? '',
			description: (frontmatter.description as string) ?? '',
			frontmatter,
			url,
			pages: this.pagesList,
		};
	}

	/**
	 * Build preview data for a _layout.md file.
	 * Shows the layout's regions with a placeholder for the main content area.
	 */
	buildLayoutPreviewData(
		filePath: string,
		rawContent: string,
		identityTransform: (tree: RendererNode) => RendererNode,
		highlightTransform?: (tree: RendererNode) => RendererNode,
	): PagePreviewData {
		const { frontmatter } = parseFrontmatter(rawContent);

		// For layouts, resolve regions from the layout chain ending at this file's directory.
		// Use a synthetic page path in the same directory to get this layout + its parents.
		const dirPrefix = filePath.replace(/_layout\.md$/, '');
		const syntheticPagePath = dirPrefix ? `${dirPrefix}__preview__.md` : '__preview__.md';

		// We need to resolve regions as if a page existed in this directory.
		// The layout chain includes this layout file and all parent layouts.
		const regions = this.resolveAndTransformRegions(syntheticPagePath, identityTransform, highlightTransform, rawContent, filePath);

		// Compute URL for route rule matching (use the directory URL)
		const url = this.router.filePathToUrl(dirPrefix ? `${dirPrefix}index.md` : 'index.md');

		// Placeholder renderable for the main content area
		const placeholder = {
			$$mdtype: 'Tag',
			name: 'div',
			attributes: {
				style: 'padding:2rem;text-align:center;color:#94a3b8;border:2px dashed #e2e8f0;border-radius:8px;margin:1rem 0;font-family:system-ui,-apple-system,sans-serif;',
			},
			children: ['Page content will appear here'],
		};

		return {
			renderable: placeholder,
			regions,
			title: (frontmatter.title as string) ?? 'Layout Preview',
			description: '',
			frontmatter,
			url,
			pages: this.pagesList,
		};
	}

	/**
	 * Resolve layouts for a file path and transform all region content
	 * through the identity transform + highlight pipeline.
	 *
	 * For layout previews, `liveLayoutContent` and `liveLayoutPath` can be
	 * provided to substitute the on-disk layout with the live-edited content.
	 */
	private resolveAndTransformRegions(
		filePath: string,
		identityTransform: (tree: RendererNode) => RendererNode,
		highlightTransform?: (tree: RendererNode) => RendererNode,
		liveLayoutContent?: string,
		liveLayoutPath?: string,
	): Record<string, { name: string; mode: string; content: unknown[] }> {
		if (!this.tree) return {};

		// Find a real page to anchor the layout resolution.
		// For synthetic paths (layout preview), find any page in the same directory,
		// or fall back to resolving from the tree structure.
		const page = this.findPageOrSynthetic(filePath);
		if (!page) return {};

		const icons = this.themeConfig.icons;
		const layout = resolveLayouts(page, this.tree.root, icons);

		const regions: Record<string, { name: string; mode: string; content: unknown[] }> = {};
		for (const [name, region] of layout.regions) {
			const transformedContent = region.content.map((c) => {
				const s = serializeTree(c) as RendererNode;
				let t = identityTransform(s);
				if (highlightTransform) t = highlightTransform(t);
				return t;
			});
			regions[name] = {
				name: region.name,
				mode: region.mode,
				content: transformedContent,
			};
		}

		return regions;
	}

	/**
	 * Find a page in the tree by relative path.
	 * For synthetic paths (layout preview), creates a minimal ContentPage stub.
	 */
	private findPageOrSynthetic(filePath: string): ContentPage | null {
		if (!this.tree) return null;

		// Try exact match first
		for (const page of this.tree.pages()) {
			if (page.relativePath === filePath) return page;
		}

		// For synthetic paths, find any page in the same directory
		// to anchor layout resolution
		const dirPrefix = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/') + 1) : '';
		for (const page of this.tree.pages()) {
			if (dirPrefix && page.relativePath.startsWith(dirPrefix)) return page;
		}

		// If no pages exist in this directory, create a minimal stub
		// that allows layout resolution to work
		return {
			relativePath: filePath,
			raw: '---\ntitle: Preview\n---\n',
		} as ContentPage;
	}

	/** Build the pages list for Nav component link resolution */
	private buildPagesList(): Array<{ url: string; path: string; title: string; draft: boolean }> {
		if (!this.tree) return [];
		const pages: Array<{ url: string; path: string; title: string; draft: boolean }> = [];
		for (const page of this.tree.pages()) {
			const { frontmatter } = parseFrontmatter(page.raw);
			pages.push({
				url: this.router.filePathToUrl(page.relativePath),
				path: page.relativePath,
				title: (frontmatter.title as string) ?? page.relativePath,
				draft: frontmatter.draft === true,
			});
		}
		return pages;
	}
}
