/**
 * Expand rune (SPEC-066, WORK-260).
 *
 * Inline-substitution counterpart to `{% ref %}`: same registry lookup
 * chain, different output mode (inline content instead of an anchor).
 * Schema is self-closing and emits a placeholder; the postProcess hook
 * (`expand-pipeline.ts`) walks for placeholders, resolves the entity
 * from the registry, reads its `sourceFile`, calls the plugin's
 * `extract()` to get the embeddable subtree, processes headings, and
 * substitutes the content inline. The wrapper is a `<section
 * data-rune="expand">` with `data-outline-scope` set so the WORK-259
 * walkers automatically TOC-isolate the embed and namespace its
 * heading IDs.
 */

import Markdoc from '@markdoc/markdoc';
import type { Config, Node, Schema } from '@markdoc/markdoc';
const { Tag } = Markdoc;

/** Sentinel attribute value used to identify expand placeholders in the
 *  renderable tree. PostProcess queries for `data-rune="expand-pending"`
 *  to find tags awaiting resolution. After substitution the wrapper
 *  carries `data-rune="expand"`. */
export const EXPAND_PLACEHOLDER_MARKER = 'expand-pending';

export const expand: Schema = {
	selfClosing: true,
	attributes: {
		primary: {
			type: String,
			required: true,
			description: 'Entity ID or name to substitute inline. Same lookup chain as xref.',
		},
		level: {
			type: Number,
			required: false,
			description: 'Optional heading-demotion opt-in. When set, embedded headings shift by `N - 1` and the embed joins the host outline instead of staying TOC-isolated.',
		},
		type: {
			type: String,
			required: false,
			description: 'Entity type hint for disambiguation when the same ID/name lives in multiple registries.',
		},
		canonical: {
			type: Boolean,
			required: false,
			description: 'When true, append a visible "View canonical" link pointing at the entity\'s canonical URL.',
		},
		label: {
			type: String,
			required: false,
			description: 'Custom label for the canonical link (only meaningful when `canonical=true`).',
		},
	},
	transform(node: Node, _config: Config) {
		const id = node.attributes.primary as string;
		const level = node.attributes.level as number | undefined;
		const typeHint = node.attributes.type as string | undefined;
		const canonical = node.attributes.canonical === true;
		const label = node.attributes.label as string | undefined;

		const attrs: Record<string, unknown> = {
			'data-rune': EXPAND_PLACEHOLDER_MARKER,
			'data-expand-id': id,
		};
		if (typeof level === 'number') attrs['data-expand-level'] = String(level);
		if (typeHint) attrs['data-expand-type'] = typeHint;
		if (canonical) attrs['data-expand-canonical'] = 'true';
		if (label) attrs['data-expand-label'] = label;

		// The placeholder is a `<div>` rather than a `<span>` because the
		// substituted content is block-level (the embedded rune's `<section>`).
		// A `<span>` parent would produce invalid block-in-inline HTML once
		// the postProcess substitutes content.
		return new Tag('div', attrs, []);
	},
};
