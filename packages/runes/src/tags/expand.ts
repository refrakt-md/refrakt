import Markdoc from '@markdoc/markdoc';
import type { Config, Node, Schema } from '@markdoc/markdoc';
import { declareUniversalPosture } from '../lib/index.js';
const { Tag } = Markdoc;

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
			description:
				'Optional heading-demotion opt-in. When set, embedded headings shift by `N - 1` and the embed joins the host outline instead of staying TOC-isolated.',
		},
		type: {
			type: String,
			required: false,
			description:
				'Entity type hint for disambiguation when the same ID/name lives in multiple registries.',
		},
		canonical: {
			type: Boolean,
			required: false,
			description:
				'When true, append a visible "View canonical" link pointing at the entity\'s canonical URL.',
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

		// A `div`, not a `span`: the substituted content is block-level.
		return new Tag('div', attrs, []);
	},
};

declareUniversalPosture(expand, 'none');
