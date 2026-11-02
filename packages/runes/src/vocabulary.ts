/**
 * ADR-043 decision 5 (WORK-672) — the theme vocabulary, assembled from the
 * registries that define each part of it. Nothing here restates a value: a new
 * meta type, layout, role, media kind or axis value appears in the coverage
 * report by being added where it is defined.
 */
import {
	LAYOUT_PRIMITIVES,
	META_TYPES,
	RENDERED_META_TYPES,
	SENTIMENTS,
	UNIVERSAL_AXIS_FACETS,
	vocabularyEntries,
	type VocabularyDimension,
	type VocabularyEntry,
} from '@refrakt-md/transform';
import { GROUP_LAYOUTS_LIST, SEQUENCE_VALUES } from './lib/composition.js';
import { SECTION_ROLES } from './lib/slots.js';
import { universalAttributes } from './lib/universal-attribute-defs.js';
import { mediaKinds } from './tags/section.js';

/** The vocabulary's dimensions, in reading order: meaning first (what a value
 *  is), then arrangement, then the universal axes. */
export function themeVocabularyDimensions(): VocabularyDimension[] {
	const dims: VocabularyDimension[] = [
		{
			name: 'meta-type',
			attribute: 'data-meta-type',
			values: [...META_TYPES, ...RENDERED_META_TYPES],
			source: 'META_TYPES, RENDERED_META_TYPES (@refrakt-md/transform)',
		},
		{
			name: 'sentiment',
			attribute: 'data-meta-sentiment',
			values: SENTIMENTS,
			source: 'SENTIMENTS (@refrakt-md/transform)',
		},
		{
			name: 'zone-layout',
			attribute: 'data-zone-layout',
			values: [...new Set<string>([...LAYOUT_PRIMITIVES, ...GROUP_LAYOUTS_LIST])],
			source: 'LAYOUT_PRIMITIVES, and `{% group %}` layouts',
		},
		{
			name: 'sequence',
			attribute: 'data-sequence',
			values: SEQUENCE_VALUES,
			source: 'the `sequence` styles',
		},
		{
			name: 'section-role',
			attribute: 'data-section',
			values: SECTION_ROLES,
			source: 'SECTION_ROLES',
		},
		{
			name: 'media-kind',
			attribute: 'data-media',
			values: mediaKinds,
			source: "`section`'s `media` kinds",
		},
	];
	// The universal axes, from the facet registry: each attribute an axis
	// emits, with the axis's own closed values when it states them for a sole
	// attribute, else the author attribute's `matches`, else (an open value, a
	// preset name or a flag) the attribute's presence.
	for (const facet of UNIVERSAL_AXIS_FACETS) {
		const c = facet.contract;
		const attrs = c.dataAttributes ?? [];
		for (const attribute of attrs) {
			const name = attribute.replace(/^data-/, '');
			const own = attrs.length === 1 ? c.values : undefined;
			const matches = universalAttributes[name]?.matches;
			const values = own ?? (Array.isArray(matches) ? (matches as readonly string[]) : null);
			dims.push({
				name: attrs.length === 1 ? facet.axis : `${facet.axis}:${name}`,
				attribute,
				values,
				source: own
					? `the \`${facet.axis}\` axis`
					: values
						? `the \`${name}\` attribute`
						: `the \`${facet.axis}\` axis (open values)`,
			});
		}
	}
	return dims;
}

/** Every vocabulary entry, with the selector that styles it. */
export function themeVocabulary(): VocabularyEntry[] {
	return vocabularyEntries(themeVocabularyDimensions());
}
