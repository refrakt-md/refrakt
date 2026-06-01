import Markdoc from '@markdoc/markdoc';
import type { Config, Node, RenderableTreeNode, Schema } from '@markdoc/markdoc';
const { Tag } = Markdoc;

const sentimentValues = ['positive', 'negative', 'caution', 'neutral'] as const;
const typeValues = ['status', 'category', 'quantity', 'temporal', 'tag', 'id'] as const;

/**
 * Badge rune — inline pill that visually flags a piece of content.
 *
 * The label is children content (free-form text or inline runes). Visual
 * variant comes from the universal metadata-system dimensions
 * (`data-meta-sentiment`, `data-meta-type`), so themes that ship
 * metadata-system CSS style every sentiment / type combination
 * automatically — the badge rune emits the base `.rf-badge` pill shape
 * and lets the universal rules do the rest.
 *
 * Usage:
 *   {% badge %}Frontend{% /badge %}
 *   {% badge sentiment="positive" %}New{% /badge %}
 *   {% badge sentiment="caution" %}Beta{% /badge %}
 *   {% badge type="status" sentiment="positive" %}Active{% /badge %}
 */
export const badge: Schema = {
	inline: true,
	attributes: {
		sentiment: {
			type: String,
			required: false,
			matches: sentimentValues.slice(),
			description: 'Sentiment dimension: positive, negative, caution, neutral. Default: neutral.',
		},
		type: {
			type: String,
			required: false,
			matches: typeValues.slice(),
			description: 'Meta-type dimension: status, category, quantity, temporal, tag, id. Default: tag.',
		},
	},
	transform(node: Node, config: Config) {
		const sentiment = (node.attributes.sentiment as string | undefined) ?? 'neutral';
		const type = (node.attributes.type as string | undefined) ?? 'tag';

		const attrs: Record<string, string> = {
			class: 'rf-badge',
			'data-rune': 'badge',
			'data-meta-sentiment': sentiment,
			'data-meta-type': type,
		};

		const children = node.transformChildren(config) as RenderableTreeNode[];
		return new Tag('span', attrs, children);
	},
};
