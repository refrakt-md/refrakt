import Markdoc from '@markdoc/markdoc';
import type { Config, Node, Schema } from '@markdoc/markdoc';
import { declareUniversalPosture } from '../lib/index.js';
const { Tag } = Markdoc;

export const XREF_RUNE_MARKER = 'xref';

export const xref: Schema = {
	selfClosing: true,
	inline: true,
	attributes: {
		primary: {
			type: String,
			required: true,
			description: 'Entity ID or name to resolve',
		},
		label: {
			type: String,
			required: false,
			description: 'Custom link text (defaults to entity title)',
		},
		type: {
			type: String,
			required: false,
			description: 'Entity type hint for disambiguation',
		},
		preview: {
			type: String,
			required: false,
			matches: ['drawer'],
			description:
				'Preview target. `"drawer"` hoists a drawer containing the entity\'s expanded content + a link to its resolved page URL in the chrome footer, leaving an inline link at the call site that opens it. Absent → today\'s behaviour (just the inline link).',
		},
	},
	transform(node: Node, config: Config) {
		const id = node.attributes.primary as string;
		const label = node.attributes.label as string | undefined;
		const type = node.attributes.type as string | undefined;
		const preview = node.attributes.preview as string | undefined;

		const attrs: Record<string, string> = {
			'data-rune': XREF_RUNE_MARKER,
			'data-xref-id': id,
		};

		if (label) attrs['data-xref-label'] = label;
		if (type) attrs['data-xref-type'] = type;
		if (preview) attrs['data-xref-preview'] = preview;

		return new Tag('span', attrs, [label || id]);
	},
};

declareUniversalPosture(xref, 'inline');
