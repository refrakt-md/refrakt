import type { RuneConfig } from '@refrakt-md/transform';
import { ratioToFr, resolveValign, resolveGap } from '@refrakt-md/transform';

export const config: Record<string, RuneConfig> = {
	Character: {
		block: 'character',
		defaultDensity: 'full',
		sections: { badge: 'header', name: 'title', content: 'body', portrait: 'media' },
		mediaSlots: { portrait: 'portrait' },
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
					{ tag: 'span', ref: 'role-badge', metaText: 'role', label: 'Role:', metaType: 'category', metaRank: 'primary' },
					{ tag: 'span', ref: 'status-badge', metaText: 'status', label: 'Status:', condition: 'status', metaType: 'status', metaRank: 'primary', sentimentMap: { alive: 'positive', dead: 'negative', unknown: 'neutral', missing: 'caution' } },
				],
			},
		},
		editHints: { name: 'inline', portrait: 'image', body: 'none', sections: 'none' },
	},
	CharacterSection: { block: 'character-section', parent: 'Character', autoLabel: { span: 'header' }, editHints: { header: 'inline', name: 'inline', body: 'none' } },

	Realm: {
		block: 'realm',
		defaultDensity: 'full',
		sections: { badge: 'header', name: 'title', scene: 'media' },
		mediaSlots: { scene: 'cover' },
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
					{ tag: 'span', ref: 'type-badge', metaText: 'realmType', label: 'Type:', metaType: 'category', metaRank: 'primary' },
					{ tag: 'span', ref: 'scale-badge', metaText: 'scale', label: 'Scale:', condition: 'scale', metaType: 'category', metaRank: 'secondary' },
				],
			},
		},
		autoLabel: { scene: 'scene' },
		editHints: { name: 'inline', scene: 'image', body: 'none', sections: 'none' },
	},
	RealmSection: { block: 'realm-section', parent: 'Realm', autoLabel: { span: 'header' }, editHints: { header: 'inline', name: 'inline', body: 'none' } },

	Lore: {
		block: 'lore',
		defaultDensity: 'full',
		sections: { badge: 'header', title: 'title', content: 'body' },
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
					{ tag: 'span', ref: 'category-badge', metaText: 'category', label: 'Category:', condition: 'category', metaType: 'category', metaRank: 'primary' },
				],
			},
		},
		editHints: { title: 'inline', body: 'none' },
	},

	Faction: {
		block: 'faction',
		defaultDensity: 'full',
		sections: { badge: 'header', name: 'title', scene: 'media' },
		mediaSlots: { scene: 'cover' },
		modifiers: {
			factionType: { source: 'meta' },
			alignment: { source: 'meta' },
			size: { source: 'meta' },
			tags: { source: 'meta' },
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
				conditionAny: ['factionType', 'alignment', 'size'],
				children: [
					{ tag: 'span', ref: 'type-badge', metaText: 'factionType', label: 'Type:', condition: 'factionType', metaType: 'category', metaRank: 'primary' },
					{ tag: 'span', ref: 'alignment-badge', metaText: 'alignment', label: 'Alignment:', condition: 'alignment', metaType: 'category', metaRank: 'primary', sentimentMap: { good: 'positive', neutral: 'neutral', evil: 'negative', chaotic: 'caution', lawful: 'neutral' } },
					{ tag: 'span', ref: 'size-badge', metaText: 'size', label: 'Size:', condition: 'size', metaType: 'quantity', metaRank: 'secondary' },
				],
			},
		},
		autoLabel: { scene: 'scene' },
		editHints: { name: 'inline', scene: 'image', body: 'none', sections: 'none' },
	},
	FactionSection: { block: 'faction-section', parent: 'Faction', autoLabel: { span: 'header' }, editHints: { header: 'inline', name: 'inline', body: 'none' } },

	Plot: {
		block: 'plot',
		defaultDensity: 'full',
		sections: { badge: 'header', title: 'title' },
		modifiers: {
			plotType: { source: 'meta', default: 'arc' },
			structure: { source: 'meta', default: 'linear' },
			tags: { source: 'meta' },
		},
		structure: {
			badge: {
				tag: 'div', before: true,
				conditionAny: ['plotType', 'structure'],
				children: [
					{ tag: 'span', ref: 'type-badge', metaText: 'plotType', label: 'Type:', condition: 'plotType', metaType: 'category', metaRank: 'primary' },
					{ tag: 'span', ref: 'structure-badge', metaText: 'structure', label: 'Structure:', condition: 'structure', metaType: 'category', metaRank: 'secondary' },
				],
			},
		},
		editHints: { title: 'inline', beats: 'none' },
		postTransform(node, { modifiers }) {
			// Linear plots use connected sequence for beat timeline
			if (modifiers.structure === 'linear') {
				const children = [...node.children];
				for (let i = 0; i < children.length; i++) {
					const child = children[i];
					if (typeof child === 'object' && child !== null && !Array.isArray(child) && (child as any).name === 'ol') {
						children[i] = { ...child, attributes: { ...(child as any).attributes, 'data-sequence': 'connected' } } as any;
					}
				}
				return { ...node, children };
			}
			return node;
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
		editHints: { label: 'inline', body: 'none' },
		postTransform(node, { modifiers }) {
			const STATUS_TO_CHECKED: Record<string, string> = {
				complete: 'checked',
				active: 'active',
				planned: 'unchecked',
				abandoned: 'skipped',
			};
			const checked = STATUS_TO_CHECKED[modifiers.status];
			if (checked) {
				return { ...node, attributes: { ...node.attributes, 'data-checked': checked } };
			}
			return node;
		},
	},

	Bond: {
		block: 'bond',
		defaultDensity: 'compact',
		sections: { body: 'body' },
		modifiers: {
			bondType: { source: 'meta' },
			status: { source: 'meta', default: 'active' },
			bidirectional: { source: 'meta', default: 'true' },
		},
		editHints: { from: 'inline', to: 'inline', connector: 'none', arrow: 'none', body: 'none' },
	},

	Storyboard: {
		block: 'storyboard',
		defaultDensity: 'full',
		modifiers: {
			variant: { source: 'meta', default: 'clean' },
			columns: { source: 'meta', default: '3' },
		},
		styles: { columns: '--sb-columns' },
		editHints: { panels: 'none' },
	},
	StoryboardPanel: { block: 'storyboard-panel', parent: 'Storyboard', mediaSlots: { image: 'cover' }, editHints: { image: 'image', caption: 'inline', body: 'none' } },
};
