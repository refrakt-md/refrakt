import Markdoc from '@markdoc/markdoc';
import type { Config, Node, RenderableTreeNode, Schema } from '@markdoc/markdoc';
import { declareUniversalPosture } from '../lib/index.js';
const { Tag } = Markdoc;

const sentimentValues = ['positive', 'negative', 'caution', 'neutral'] as const;
const typeValues = ['status', 'category', 'quantity', 'temporal', 'tag', 'id'] as const;

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
			description:
				'Meta-type dimension: status, category, quantity, temporal, tag, id. Default: tag.',
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

declareUniversalPosture(badge, 'inline');
