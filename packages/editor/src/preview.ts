import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import type { Schema } from '@markdoc/markdoc';
import { tags, nodes, serializeTree } from '@refrakt-md/runes';
import { createTransform, renderToHtml } from '@refrakt-md/transform';
import type { ThemeConfig, RendererNode } from '@refrakt-md/transform';
import { parseFrontmatter } from '@refrakt-md/content';
import type { HookSet } from '@refrakt-md/content';
import type { AggregatedData, TransformedPage, PipelineWarning, PipelineContext } from '@refrakt-md/types';

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
	extraTags?: Record<string, Schema>,
	pipelineOptions?: PreviewPipelineOptions,
): string {
	const fullPath = join(contentDir, filePath);
	const raw = readFileSync(fullPath, 'utf-8');
	return renderPreviewContent(raw, themeConfig, themeCss, highlightTransform, extraTags, pipelineOptions);
}

export interface PreviewPipelineOptions {
	/** Cached aggregated data from the cross-page pipeline */
	aggregated?: AggregatedData;
	/** HookSets to run as Phase 4 postProcess before serialization */
	hookSets?: HookSet[];
	/** URL of the page being previewed (for postProcess context) */
	url?: string;
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
	extraTags?: Record<string, Schema>,
	pipelineOptions?: PreviewPipelineOptions,
): string {
	const { frontmatter, content } = parseFrontmatter(raw);

	// Run the Markdoc pipeline
	const ast = Markdoc.parse(content);
	const mergedTags = extraTags ? { ...tags, ...extraTags } : tags;
	let renderable = Markdoc.transform(ast, {
		tags: mergedTags,
		nodes,
		variables: { __source: content, __icons: themeConfig.icons },
	});

	// Phase 4: run postProcess hooks before serialization
	if (pipelineOptions?.hookSets?.length && pipelineOptions.aggregated) {
		renderable = runPreviewPostProcess(
			renderable,
			pipelineOptions.aggregated,
			pipelineOptions.hookSets,
			pipelineOptions.url ?? '/',
			frontmatter as Record<string, unknown>,
		) as typeof renderable;
	}

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

function runPreviewPostProcess(
	renderable: unknown,
	aggregated: AggregatedData,
	hookSets: HookSet[],
	url: string,
	frontmatter: Record<string, unknown>,
): unknown {
	let page: TransformedPage = {
		url,
		title: (frontmatter.title as string) ?? '',
		renderable,
		frontmatter,
		headings: [],
	};
	const warnings: PipelineWarning[] = [];
	for (const { packageName, hooks } of hookSets) {
		if (!hooks.postProcess) continue;
		const ctx: PipelineContext = {
			info(message, u) { warnings.push({ severity: 'info', phase: 'postProcess', packageName, url: u ?? url, message }); },
			warn(message, u) { warnings.push({ severity: 'warning', phase: 'postProcess', packageName, url: u ?? url, message }); },
			error(message, u) { warnings.push({ severity: 'error', phase: 'postProcess', packageName, url: u ?? url, message }); },
		};
		try {
			page = hooks.postProcess(page, aggregated, ctx) as TransformedPage;
		} catch {
			// Degrade silently
		}
	}
	return page.renderable;
}
