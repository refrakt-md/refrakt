/**
 * Build rune metadata and theme config for the block editor.
 * This replicates what the editor server provides via /api/runes and /api/config,
 * but built client-side from the packages directly.
 */
import { runes as allRunes } from '@refrakt-md/runes';
import { luminaConfig } from '@refrakt-md/lumina/transform';
import type { ThemeConfig } from '@refrakt-md/transform';

export interface RuneAttributeInfo {
	type: string;
	required: boolean;
	values?: string[];
}

export interface RuneInfo {
	name: string;
	aliases: string[];
	description: string;
	selfClosing: boolean;
	category: string;
	attributes: Record<string, RuneAttributeInfo>;
}

/** Runes that are children of other runes (not top-level insertable) */
const CHILD_RUNES = new Set([
	'nav-group', 'nav-item', 'tab', 'bento-item', 'grid-item', 'accordion-item',
	'step', 'cast-member', 'timeline-entry', 'changelog-entry', 'pricing-tier',
	'pricing-feature', 'conversation-message', 'reveal-item', 'annotate-marker',
	'storyboard-panel', 'note', 'form-field', 'comparison-column', 'comparison-row',
	'symbol-group', 'symbol-member', 'map-pin', 'definition', 'region',
]);

const RUNE_CATEGORIES: Record<string, string> = {
	hero: 'Section', cta: 'Section', feature: 'Section', pricing: 'Section',
	comparison: 'Section', testimonial: 'Section',

	hint: 'Content', steps: 'Content', sidenote: 'Content', figure: 'Content',
	details: 'Content', embed: 'Content', icon: 'Content', form: 'Content',

	grid: 'Layout', tabs: 'Layout', accordion: 'Layout', bento: 'Layout',
	reveal: 'Layout', annotate: 'Layout',

	codegroup: 'Code & Data', compare: 'Code & Data', diff: 'Code & Data',
	api: 'Code & Data', symbol: 'Code & Data', datatable: 'Code & Data',
	chart: 'Code & Data', diagram: 'Code & Data', preview: 'Code & Data',
	sandbox: 'Code & Data',

	recipe: 'Semantic', howto: 'Semantic', event: 'Semantic', cast: 'Semantic',
	organization: 'Semantic', timeline: 'Semantic', changelog: 'Semantic',
	conversation: 'Semantic', storyboard: 'Semantic', map: 'Semantic',
	'music-playlist': 'Semantic', 'music-recording': 'Semantic', error: 'Semantic',

	swatch: 'Design', palette: 'Design', typography: 'Design',
	spacing: 'Design', 'design-context': 'Design',

	nav: 'Site', layout: 'Site', toc: 'Site', breadcrumb: 'Site',
};

let _runeInfoCache: RuneInfo[] | null = null;

/** Build RuneInfo[] from the runes package (cached after first call) */
export function getRuneInfoList(): RuneInfo[] {
	if (_runeInfoCache) return _runeInfoCache;

	const result: RuneInfo[] = [];
	for (const rune of Object.values(allRunes)) {
		if (CHILD_RUNES.has(rune.name)) continue;

		const attrs: Record<string, RuneAttributeInfo> = {};
		if (rune.schema.attributes) {
			for (const [name, attr] of Object.entries(rune.schema.attributes)) {
				const typeName = typeof attr.type === 'function'
					? attr.type.name
					: Array.isArray(attr.type)
						? attr.type.map((t: unknown) => (t as { name?: string }).name ?? 'unknown').join(' | ')
						: 'String';
				attrs[name] = {
					type: typeName,
					required: attr.required ?? false,
					...(Array.isArray(attr.matches) ? { values: attr.matches.map(String) } : {}),
				};
			}
		}

		result.push({
			name: rune.name,
			aliases: rune.aliases,
			description: rune.description,
			selfClosing: rune.schema.selfClosing ?? false,
			category: RUNE_CATEGORIES[rune.name] ?? 'Other',
			attributes: attrs,
		});
	}

	_runeInfoCache = result;
	return result;
}

/**
 * Get the Lumina theme config for block preview rendering.
 * The config is JSON-safe (postTransform functions are stripped)
 * because block-renderer.ts restores them from baseConfig.
 */
export function getThemeConfig(): ThemeConfig {
	// Strip postTransform functions for JSON-safety (block-renderer restores them)
	const runes: Record<string, any> = {};
	for (const [name, rune] of Object.entries(luminaConfig.runes)) {
		const { postTransform, ...rest } = rune as any;
		runes[name] = rest;
	}
	return { ...luminaConfig, runes } as ThemeConfig;
}
