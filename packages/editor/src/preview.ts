import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import { tags, nodes, serializeTree } from '@refrakt-md/runes';
import { createTransform, renderToHtml } from '@refrakt-md/transform';
import type { ThemeConfig, RendererNode } from '@refrakt-md/transform';
import { parseFrontmatter } from '@refrakt-md/content';

/**
 * Render a markdown file through the full refrakt.md pipeline,
 * returning a complete HTML document string with theme CSS inlined.
 */
export function renderPreviewPage(
	contentDir: string,
	filePath: string,
	themeConfig: ThemeConfig,
	themeCss: string,
	highlightTransform?: (tree: RendererNode) => RendererNode,
): string {
	const fullPath = join(contentDir, filePath);
	const raw = readFileSync(fullPath, 'utf-8');
	return renderPreviewContent(raw, themeConfig, themeCss, highlightTransform);
}

/**
 * Render raw markdown content (not from disk) through the full pipeline.
 * Used for live preview while typing.
 */
export function renderPreviewContent(
	raw: string,
	themeConfig: ThemeConfig,
	themeCss: string,
	highlightTransform?: (tree: RendererNode) => RendererNode,
): string {
	const { frontmatter, content } = parseFrontmatter(raw);

	// Run the Markdoc pipeline
	const ast = Markdoc.parse(content);
	const renderable = Markdoc.transform(ast, {
		tags,
		nodes,
		variables: { __source: content, __icons: themeConfig.icons },
	});
	const serialized = serializeTree(renderable) as RendererNode;

	// Apply identity transform (BEM classes, structure injection, meta consumption)
	const transform = createTransform(themeConfig);
	let transformed = transform(serialized);

	// Apply syntax highlighting if available
	if (highlightTransform) {
		transformed = highlightTransform(transformed);
	}

	// Render to HTML string
	const bodyHtml = renderToHtml(transformed, { pretty: true });

	const title = frontmatter.title ?? 'Preview';

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(String(title))}</title>
  <style>${themeCss}</style>
  <style>
    body {
      margin: 0;
      padding: 2rem;
      font-family: var(--rf-font-sans, system-ui, -apple-system, sans-serif);
      color: var(--rf-color-text, #1a1a2e);
      background: var(--rf-color-bg, #ffffff);
      line-height: 1.6;
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
