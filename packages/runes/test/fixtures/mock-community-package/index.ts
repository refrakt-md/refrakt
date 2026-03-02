import type { RunePackage } from '@refrakt-md/types';
import type { RuneConfig } from '@refrakt-md/transform';

/**
 * Mock community package for testing.
 * Simulates a "game-system" package with a few runes and extensions.
 */

// A simple Markdoc schema (no Model API needed for test)
const itemSchema = {
	attributes: {
		name: { type: String, required: true },
		rarity: { type: String, matches: ['common', 'uncommon', 'rare', 'legendary'] },
	},
	transform(node: any, config: any) {
		const attrs = node.transformAttributes(config);
		return {
			$$mdtype: 'Tag' as const,
			name: 'section',
			attributes: { typeof: 'GameItem', ...attrs },
			children: node.transformChildren(config),
		};
	},
};

const spellSchema = {
	attributes: {
		name: { type: String, required: true },
		level: { type: Number },
		school: { type: String },
	},
	transform(node: any, config: any) {
		const attrs = node.transformAttributes(config);
		return {
			$$mdtype: 'Tag' as const,
			name: 'section',
			attributes: { typeof: 'GameSpell', ...attrs },
			children: node.transformChildren(config),
		};
	},
};

const itemRuneConfig: RuneConfig = {
	block: 'game-item',
	modifiers: {
		rarity: { source: 'attribute', default: 'common' },
	},
};

const spellRuneConfig: RuneConfig = {
	block: 'game-spell',
	modifiers: {
		school: { source: 'attribute' },
	},
};

export const gameSystem: RunePackage = {
	name: 'game-system',
	displayName: 'Game System',
	version: '1.0.0',
	runes: {
		'item': {
			transform: itemSchema,
			schema: {
				name: { type: 'string', required: true },
				rarity: { type: 'string', matches: ['common', 'uncommon', 'rare', 'legendary'] },
			},
		},
		'spell': {
			transform: spellSchema,
			schema: {
				name: { type: 'string', required: true },
				level: { type: 'number' },
				school: { type: 'string' },
			},
		},
	},
	extends: {
		'character': {
			schema: {
				class: { type: 'string' },
				level: { type: 'number' },
			},
		},
	},
	theme: {
		runes: {
			GameItem: itemRuneConfig,
			GameSpell: spellRuneConfig,
		},
		icons: {
			'game-item': {
				common: '<svg>common</svg>',
				rare: '<svg>rare</svg>',
			},
		},
	},
};

export default gameSystem;
