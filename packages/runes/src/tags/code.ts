import Markdoc from '@markdoc/markdoc';
import type { Config, Node, RenderableTreeNode, Schema } from '@markdoc/markdoc';
import { declareUniversalPosture } from '../lib/index.js';
const { Tag } = Markdoc;

/**
 * Code rune — inline `<code>`, for content backticks cannot carry (WORK-551).
 *
 * A backtick code span is **literal by definition**: everything between the
 * backticks is text, so Markdoc syntax inside one is never parsed. That makes
 * it the one inline construct a variable cannot survive:
 *
 *     `{% $row.name %}`              → <code>{% $row.name %}</code>
 *     {% code %}{% $row.name %}{% /code %}  → <code>href</code>
 *
 * Every other inline form passes a variable through intact — links, nested
 * emphasis, and rune bodies (`{% badge %}{% $row.name %}{% /badge %}` renders
 * the value). So this is the escape hatch for the single gap, not a second
 * spelling of an existing feature.
 *
 * **Backticks remain correct for static code.** Reach for this rune only when
 * the content is dynamic — a `{% data %}` row value, a partial's variable —
 * exactly as `**bold**` remains correct for static emphasis.
 *
 * Renders the same element a backtick span does, so the theme styles both with
 * one rule and a page mixing them looks uniform.
 */
export const code: Schema = {
	inline: true,
	attributes: {},
	transform(node: Node, config: Config) {
		const children = node.transformChildren(config) as RenderableTreeNode[];
		return new Tag('code', { 'data-rune': 'code' }, children);
	},
};

// SPEC-125 Phase 3 — an inline `<code>`; the block axes have nothing to act on.
declareUniversalPosture(code, 'inline');
