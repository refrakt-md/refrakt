import type { RuneConfig } from '@refrakt-md/transform';
import { ratioToFr, resolveValign, resolveGap } from '@refrakt-md/transform';

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
		editHints: { name: 'inline', portrait: 'image', body: 'none', sections: 'none' },
	},
	CharacterSection: { block: 'character-section', parent: 'Character', autoLabel: { span: 'header' }, editHints: { header: 'inline', name: 'inline', body: 'none' } },

	Realm: {
		block: 'realm',
		modifiers: {
			realmType: { source: 'meta', default: 'place' },
			scale: { source: 'meta' },
			tags: { source: 'meta' },
			parent: { source: 'meta' },
			layout: { source: 'meta', default: 'stacked' },
			ratio: { source: 'meta', default: '1 1', noBemClass: true },
			valign: { source: 'meta', default: 'top', noBemClass: true },
			gap: { source: 'meta', default: 'default', noBemClass: true },
			collapse: { source: 'meta', noBemClass: true },
		},
		styles: {
			ratio: { prop: '--split-ratio', transform: ratioToFr },
			valign: { prop: '--split-valign', transform: resolveValign },
			gap: { prop: '--split-gap', transform: resolveGap },
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
		autoLabel: { scene: 'scene' },
		editHints: { name: 'inline', scene: 'image', body: 'none', sections: 'none' },
	},
	RealmSection: { block: 'realm-section', parent: 'Realm', autoLabel: { span: 'header' }, editHints: { header: 'inline', name: 'inline', body: 'none' } },

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
		editHints: { title: 'inline', body: 'none' },
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
		editHints: { name: 'inline', body: 'none', sections: 'none' },
	},
	FactionSection: { block: 'faction-section', parent: 'Faction', autoLabel: { span: 'header' }, editHints: { header: 'inline', name: 'inline', body: 'none' } },

	Plot: {
		block: 'plot',
		modifiers: {
			plotType: { source: 'meta', default: 'arc' },
			structure: { source: 'meta', default: 'linear' },
			tags: { source: 'meta' },
		},
		editHints: { title: 'inline', beats: 'none' },
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
		editHints: { label: 'inline', body: 'none' },
	},

	Bond: {
		block: 'bond',
		modifiers: {
			bondType: { source: 'meta' },
			status: { source: 'meta', default: 'active' },
			bidirectional: { source: 'meta', default: 'true' },
		},
		editHints: { from: 'inline', to: 'inline', connector: 'none', arrow: 'none', body: 'none' },
	},

	Storyboard: {
		block: 'storyboard',
		modifiers: {
			variant: { source: 'meta', default: 'clean' },
			columns: { source: 'meta', default: '3' },
		},
		styles: { columns: '--sb-columns' },
		editHints: { panels: 'none' },
	},
	StoryboardPanel: { block: 'storyboard-panel', parent: 'Storyboard', editHints: { image: 'image', caption: 'inline', body: 'none' } },
};
