import type { RuneConfig } from '@refrakt-md/transform';

export const config: Record<string, RuneConfig> = {
	Character: {
		block: 'character',
		contentWrapper: { tag: 'div', ref: 'content' },
		modifiers: {
			role: { source: 'meta', default: 'supporting' },
			status: { source: 'meta', default: 'alive' },
			aliases: { source: 'meta' },
			tags: { source: 'meta' },
		},
		structure: {
			badge: {
				tag: 'div', before: true,
				children: [
					{ tag: 'span', ref: 'role-badge', metaText: 'role' },
					{ tag: 'span', ref: 'status-badge', metaText: 'status', condition: 'status' },
				],
			},
		},
	},
	CharacterSection: { block: 'character-section', parent: 'Character', autoLabel: { span: 'header' } },

	Realm: {
		block: 'realm',
		contentWrapper: { tag: 'div', ref: 'content' },
		modifiers: {
			realmType: { source: 'meta', default: 'place' },
			scale: { source: 'meta' },
			tags: { source: 'meta' },
			parent: { source: 'meta' },
		},
		structure: {
			badge: {
				tag: 'div', before: true,
				children: [
					{ tag: 'span', ref: 'type-badge', metaText: 'realmType' },
					{ tag: 'span', ref: 'scale-badge', metaText: 'scale', condition: 'scale' },
				],
			},
		},
	},
	RealmSection: { block: 'realm-section', parent: 'Realm', autoLabel: { span: 'header' } },

	Lore: {
		block: 'lore',
		contentWrapper: { tag: 'div', ref: 'content' },
		modifiers: {
			category: { source: 'meta' },
			spoiler: { source: 'meta', default: 'false' },
			tags: { source: 'meta' },
		},
		structure: {
			badge: {
				tag: 'div', before: true,
				conditionAny: ['category'],
				children: [
					{ tag: 'span', ref: 'category-badge', metaText: 'category', condition: 'category' },
				],
			},
		},
	},

	Faction: {
		block: 'faction',
		contentWrapper: { tag: 'div', ref: 'content' },
		modifiers: {
			factionType: { source: 'meta' },
			alignment: { source: 'meta' },
			size: { source: 'meta' },
			tags: { source: 'meta' },
		},
		structure: {
			badge: {
				tag: 'div', before: true,
				conditionAny: ['factionType', 'alignment', 'size'],
				children: [
					{ tag: 'span', ref: 'type-badge', metaText: 'factionType', condition: 'factionType' },
					{ tag: 'span', ref: 'alignment-badge', metaText: 'alignment', condition: 'alignment' },
					{ tag: 'span', ref: 'size-badge', metaText: 'size', condition: 'size' },
				],
			},
		},
	},
	FactionSection: { block: 'faction-section', parent: 'Faction', autoLabel: { span: 'header' } },

	Plot: {
		block: 'plot',
		modifiers: {
			plotType: { source: 'meta', default: 'arc' },
			structure: { source: 'meta', default: 'linear' },
			tags: { source: 'meta' },
		},
	},
	Beat: {
		block: 'beat',
		parent: 'Plot',
		modifiers: {
			status: { source: 'meta', default: 'planned' },
			id: { source: 'meta' },
			track: { source: 'meta' },
			follows: { source: 'meta' },
		},
	},

	Bond: {
		block: 'bond',
		modifiers: {
			bondType: { source: 'meta' },
			status: { source: 'meta', default: 'active' },
			bidirectional: { source: 'meta', default: 'true' },
		},
	},

	Storyboard: {
		block: 'storyboard',
		modifiers: {
			style: { source: 'meta', default: 'clean' },
			columns: { source: 'meta', default: '3' },
		},
		styles: { columns: '--sb-columns' },
	},
	StoryboardPanel: { block: 'storyboard-panel', parent: 'Storyboard' },
};
