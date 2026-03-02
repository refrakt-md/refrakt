import type { RunePackage } from '@refrakt-md/types';

/**
 * Second mock community package for collision testing.
 * Defines an 'item' rune that collides with the game-system package.
 */

const itemSchema = {
	attributes: {
		name: { type: String, required: true },
		weight: { type: Number },
	},
	transform(node: any, config: any) {
		const attrs = node.transformAttributes(config);
		return {
			$$mdtype: 'Tag' as const,
			name: 'section',
			attributes: { typeof: 'AltItem', ...attrs },
			children: node.transformChildren(config),
		};
	},
};

export const altSystem: RunePackage = {
	name: 'alt-system',
	displayName: 'Alternative System',
	version: '1.0.0',
	runes: {
		'item': {
			transform: itemSchema,
			schema: {
				name: { type: 'string', required: true },
				weight: { type: 'number' },
			},
		},
	},
};

export default altSystem;
