import { defaultLayout, docsLayout, blogArticleLayout } from '@refrakt-md/transform';

/**
 * Layout name -> LayoutConfig map.
 *
 * This is the single framework-agnostic entry point for Lumina's layouts,
 * replacing the per-framework adapter files (ADR-009).
 */
export const layouts = {
	default: defaultLayout,
	docs: docsLayout,
	'blog-article': blogArticleLayout,
};
