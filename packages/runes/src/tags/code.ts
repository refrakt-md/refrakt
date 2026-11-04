import Markdoc from '@markdoc/markdoc';
import type { Config, Node, RenderableTreeNode, Schema } from '@markdoc/markdoc';
import { declareUniversalPosture } from '../lib/index.js';
const { Tag } = Markdoc;

export const code: Schema = {
	inline: true,
	attributes: {},
	transform(node: Node, config: Config) {
		const children = node.transformChildren(config) as RenderableTreeNode[];
		return new Tag('code', { 'data-rune': 'code' }, children);
	},
};

declareUniversalPosture(code, 'inline');
