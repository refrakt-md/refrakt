export type ChatMode = 'general' | 'code' | 'content' | 'marketing' | 'travel' | 'design' | 'full';

export interface ChatModeDefinition {
	id: ChatMode;
	label: string;
	description: string;
	/** Parent rune names included in this mode. null = all runes (full mode). */
	runes: string[] | null;
}

/** Maps parent runes to their child-only companion runes */
const CHILD_RUNE_MAP: Record<string, string[]> = {
	pricing: ['tier'],
	comparison: ['comparison-column', 'comparison-row'],
	symbol: ['symbol-group', 'symbol-member'],
	conversation: ['conversation-message'],
	annotate: ['note'],
	form: ['form-field'],
	bento: ['bento-cell'],
	storyboard: ['storyboard-panel'],
	reveal: ['reveal-step'],
	'design-context': ['palette', 'typography', 'spacing', 'swatch'],
};

const CORE_RUNES = [
	'hint',
	'grid',
	'tabs',
	'accordion',
	'details',
	'steps',
	'figure',
	'embed',
	'sidenote',
	'datatable',
	'comparison',
	'codegroup',
] as const;

/** Page-level content runes — included in general, content, and marketing modes */
const PAGE_RUNES = ['hero', 'cta', 'feature'] as const;

export const CHAT_MODES: Record<ChatMode, ChatModeDefinition> = {
	general: {
		id: 'general',
		label: 'General',
		description: 'Core runes for everyday content',
		runes: [...CORE_RUNES, ...PAGE_RUNES],
	},
	code: {
		id: 'code',
		label: 'Code & Docs',
		description: 'Technical docs, API references, and code showcases',
		runes: [...CORE_RUNES, 'sandbox', 'preview', 'diff', 'compare', 'symbol', 'api', 'diagram'],
	},
	content: {
		id: 'content',
		label: 'Content',
		description: 'Editorial content, guides, and storytelling',
		runes: [
			...CORE_RUNES,
			...PAGE_RUNES,
			'timeline',
			'changelog',
			'howto',
			'recipe',
			'testimonial',
			'annotate',
			'conversation',
		],
	},
	marketing: {
		id: 'marketing',
		label: 'Marketing',
		description: 'Landing pages, pricing, and business content',
		runes: [
			...CORE_RUNES,
			...PAGE_RUNES,
			'pricing',
			'testimonial',
			'bento',
			'cast',
			'organization',
			'event',
			'storyboard',
			'form',
		],
	},
	travel: {
		id: 'travel',
		label: 'Travel',
		description: 'Maps, itineraries, and location-based content',
		runes: [...CORE_RUNES, 'map', 'timeline', 'recipe', 'event', 'cast'],
	},
	design: {
		id: 'design',
		label: 'Design',
		description: 'Design systems, tokens, and visual prototyping',
		runes: [...CORE_RUNES, 'sandbox', 'preview', 'swatch', 'palette', 'typography', 'spacing', 'design-context'],
	},
	full: {
		id: 'full',
		label: 'Full',
		description: 'All runes available',
		runes: null,
	},
};

/** Ordered list for UI rendering */
export const CHAT_MODE_LIST: ChatModeDefinition[] = [
	CHAT_MODES.general,
	CHAT_MODES.code,
	CHAT_MODES.content,
	CHAT_MODES.marketing,
	CHAT_MODES.travel,
	CHAT_MODES.design,
	CHAT_MODES.full,
];

/**
 * Returns the expanded set of rune names for a mode, including child companions.
 * Returns undefined for 'full' mode (no filtering).
 */
export function getChatModeRunes(mode: ChatMode): Set<string> | undefined {
	const def = CHAT_MODES[mode];
	if (!def.runes) return undefined;

	const expanded = new Set(def.runes);
	for (const name of def.runes) {
		const children = CHILD_RUNE_MAP[name];
		if (children) {
			for (const child of children) {
				expanded.add(child);
			}
		}
	}
	return expanded;
}
