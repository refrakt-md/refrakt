/**
 * Edge-safe entity rendering module.
 *
 * Renders a single plan entity's Markdoc source to a serialized tree
 * (RendererNode) that can be identity-transformed by any theme and
 * rendered to HTML.
 *
 * This module has NO Node.js dependencies and runs on Cloudflare Workers.
 *
 * Usage:
 *   import { renderEntity } from '@refrakt-md/plan/render';
 *   import { identityTransform } from '@refrakt-md/lumina/transform';
 *   import { renderToHtml } from '@refrakt-md/transform';
 *
 *   const tree = renderEntity(source);
 *   const html = renderToHtml(identityTransform(tree));
 */

import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
import type { RendererNode } from '@refrakt-md/transform';
import { serializeTree } from '@refrakt-md/runes';
import { tags as coreTagOverrides, nodes as coreNodes } from '@refrakt-md/runes';
import { spec } from './tags/spec.js';
import { work } from './tags/work.js';
import { bug } from './tags/bug.js';
import { decision } from './tags/decision.js';
import { milestone } from './tags/milestone.js';

// ── Tag Schemas ─────────────────────────────────────────────

const planTags: Record<string, any> = {
	spec,
	work,
	task: work,
	bug,
	decision,
	adr: decision,
	milestone,
};

// ── Main API ────────────────────────────────────────────────

/**
 * Render a plan entity's Markdoc source to a serialized tree (RendererNode).
 *
 * The returned tree has the same structure as the static plan site produces
 * before the identity transform — preamble, body sections, meta fields, etc.
 *
 * The consumer is responsible for:
 * 1. Applying the theme's identity transform (e.g. lumina)
 * 2. Rendering to HTML (e.g. renderToHtml from @refrakt-md/transform)
 * 3. Any presentation wrapping (tabs, panels, etc.)
 */
export function renderEntity(source: string): RendererNode {
	const tags = { ...coreTagOverrides, ...planTags };

	const ast = Markdoc.parse(source);
	const renderable = Markdoc.transform(ast, {
		tags,
		nodes: coreNodes,
	});

	return serializeTree(renderable as RenderableTreeNode) as RendererNode;
}
