import type { RuneConfig } from '@refrakt-md/transform';
import { resolveValign } from '@refrakt-md/transform';

export const config: Record<string, RuneConfig> = {
	Character: {
		block: 'character',
		defaultDensity: 'full',
		defaultElevation: 'flat',
		sections: { preamble: 'preamble', name: 'title', portrait: 'media' },
		mediaSlots: { portrait: 'portrait' },
		modifiers: {
			role: { source: 'meta', default: 'supporting' },
			status: { source: 'meta', default: 'alive' },
			aliases: { source: 'meta' },
			tags: { source: 'meta' },
		},
		metaFields: {
			role: { metaType: 'category', label: 'Role' },
			status: {
				metaType: 'status', label: 'Status',
				sentimentMap: { alive: 'positive', dead: 'negative', unknown: 'neutral', missing: 'caution' },
			},
		},
		// Role/status render as a definition-list nested in the content column
		// below the title (recipe pattern). The portrait stays a floated avatar
		// (character-specific chrome), not a split media column.
		blocks: {
			metadata: { fields: ['role', 'status'], layout: 'definition-list' },
		},
		// SPEC-081: the transform emits flat slots; `layout` builds the skeleton.
		// The content column wraps the preamble header + metadata + sections; the
		// portrait stays a floated avatar sibling at the article root.
		layout: {
			root: ['portrait', 'content'],
			content: { tag: 'div', children: ['preamble', 'metadata', 'sections', 'body'] },
			preamble: { tag: 'header', children: ['name'] },
		},
		editHints: { name: 'inline', portrait: 'image', body: 'none', sections: 'none' },
	},
	CharacterSection: { block: 'character-section', parent: 'Character', autoLabel: { span: 'header' }, editHints: { header: 'inline', name: 'inline', body: 'none' } },

	Realm: {
		block: 'realm',
		defaultDensity: 'full',
		defaultElevation: 'flat',
		sections: { preamble: 'preamble', name: 'title', scene: 'media' },
		mediaSlots: { scene: 'cover' },
		modifiers: {
			realmType: { source: 'meta', default: 'place' },
			scale: { source: 'meta' },
			tags: { source: 'meta' },
			parent: { source: 'meta' },
			'media-position': { source: 'meta', default: 'top', noBemClass: true },
			'media-ratio': { source: 'meta', noBemClass: true },
			valign: { source: 'meta', noBemClass: true },
			collapse: { source: 'meta', noBemClass: true },
		},
		styles: {
			valign: { prop: '--split-valign', transform: resolveValign },
		},
		metaFields: {
			realmType: { metaType: 'category', label: 'Type' },
			scale: { metaType: 'category', label: 'Scale', condition: 'scale' },
		},
		// Facts render as a definition-list nested in the content column below
		// the title — no separate eyebrow zone.
		blocks: {
			metadata: { fields: ['realmType', 'scale'], layout: 'definition-list' },
		},
		// SPEC-081: the transform emits flat slots; `layout` builds the skeleton.
		// The split sees scene (media) + content; the content column wraps the
		// preamble header, metadata def-list, body prose, and sections.
		layout: {
			root: ['scene', 'content'],
			content: { tag: 'div', children: ['preamble', 'metadata', 'body', 'sections'] },
			preamble: { tag: 'header', children: ['name'] },
		},
		autoLabel: { scene: 'scene' },
		editHints: { name: 'inline', scene: 'image', body: 'none', sections: 'none' },
	},
	RealmSection: { block: 'realm-section', parent: 'Realm', autoLabel: { span: 'header' }, editHints: { header: 'inline', name: 'inline', body: 'none' } },

	Lore: {
		block: 'lore',
		defaultDensity: 'full',
		defaultElevation: 'flat',
		defaultReading: 'prose',
		sections: { title: 'title', body: 'body' },
		modifiers: {
			category: { source: 'meta' },
			spoiler: { source: 'meta', default: 'false' },
			tags: { source: 'meta' },
		},
		metaFields: {
			category: { metaType: 'category', label: 'Category', condition: 'category' },
		},
		blocks: {
			metadata: { fields: ['category'], layout: 'bar' },
		},
		layout: { root: ['title', 'metadata', 'body'] },
		editHints: { title: 'inline', body: 'none' },
	},

	Faction: {
		block: 'faction',
		defaultDensity: 'full',
		defaultElevation: 'flat',
		sections: { preamble: 'preamble', name: 'title', scene: 'media' },
		mediaSlots: { scene: 'cover' },
		modifiers: {
			factionType: { source: 'meta' },
			alignment: { source: 'meta' },
			size: { source: 'meta' },
			tags: { source: 'meta' },
			'media-position': { source: 'meta', default: 'top', noBemClass: true },
			'media-ratio': { source: 'meta', noBemClass: true },
			valign: { source: 'meta', noBemClass: true },
			collapse: { source: 'meta', noBemClass: true },
		},
		styles: {
			valign: { prop: '--split-valign', transform: resolveValign },
		},
		metaFields: {
			factionType: { metaType: 'category', label: 'Type', condition: 'factionType' },
			alignment: {
				metaType: 'category', label: 'Alignment', condition: 'alignment',
				sentimentMap: { good: 'positive', neutral: 'neutral', evil: 'negative', chaotic: 'caution', lawful: 'neutral' },
			},
			size: { metaType: 'quantity', label: 'Size', condition: 'size' },
		},
		// All facts render as a definition-list nested in the content column
		// below the title — no separate eyebrow zone.
		blocks: {
			metadata: { fields: ['factionType', 'alignment', 'size'], layout: 'definition-list' },
		},
		// SPEC-081: the transform emits flat slots; `layout` builds the skeleton.
		// The split sees scene (media) + content; the content column wraps the
		// preamble header, metadata def-list, body prose, and sections.
		layout: {
			root: ['scene', 'content'],
			content: { tag: 'div', children: ['preamble', 'metadata', 'body', 'sections'] },
			preamble: { tag: 'header', children: ['name'] },
		},
		autoLabel: { scene: 'scene' },
		editHints: { name: 'inline', body: 'none', sections: 'none' },
	},
	FactionSection: { block: 'faction-section', parent: 'Faction', autoLabel: { span: 'header' }, editHints: { header: 'inline', name: 'inline', body: 'none' } },

	Plot: {
		block: 'plot',
		defaultDensity: 'full',
		defaultElevation: 'flat',
		sections: { title: 'title' },
		modifiers: {
			plotType: { source: 'meta', default: 'arc' },
			structure: { source: 'meta', default: 'linear' },
			tags: { source: 'meta' },
		},
		metaFields: {
			plotType: { metaType: 'category', label: 'Type' },
			structure: { metaType: 'category', label: 'Structure' },
		},
		blocks: {
			eyebrow: { fields: ['plotType', { field: 'structure', align: 'end' }], layout: 'bar' },
		},
		layout: { root: ['eyebrow', 'title'] },
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
			status: {
				source: 'meta',
				default: 'planned',
				valueMap: {
					complete: 'checked',
					active: 'active',
					planned: 'unchecked',
					abandoned: 'skipped',
				},
				mapTarget: 'data-checked',
			},
			id: { source: 'meta' },
			track: { source: 'meta' },
			follows: { source: 'meta' },
		},
		editHints: { label: 'inline', body: 'none' },
	},

	Bond: {
		block: 'bond',
		defaultDensity: 'full',
		defaultElevation: 'flat',
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
		defaultElevation: 'flush',
		modifiers: {
			variant: { source: 'meta', default: 'clean' },
			columns: { source: 'meta', default: '3' },
		},
		styles: { columns: '--sb-columns' },
		editHints: { panels: 'none' },
	},
	StoryboardPanel: { block: 'storyboard-panel', parent: 'Storyboard', mediaSlots: { image: 'cover' }, editHints: { image: 'image', caption: 'inline', body: 'none' } },
};
