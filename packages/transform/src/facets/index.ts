import type { Facet } from './types.js';
import { orderFacets } from './driver.js';
import { elevationFacet } from './elevation.js';
import { prominenceFacet } from './prominence.js';
import { contentPlaceFacet } from './content-place.js';
import { coverFacet } from './cover.js';
import { frameFacet } from './frame.js';
import { substrateFacet } from './substrate.js';
import { tintFacet } from './tint.js';
import { bgFacet } from './bg.js';
import { widthFacet, contentMeasureFacet, spacingFacet, insetFacet } from './box.js';
import { densityFacet } from './density.js';
import { readingFacet, dropcapFacet } from './reading.js';
import { motionFacet } from './motion.js';
import {
	modifiersFacet, contextModifiersFacet, staticModifiersFacet,
	modifiersDescribe, contextModifiersDescribe, staticModifiersDescribe,
} from './modifiers.js';
import type { DescribableFacet } from './describe.js';

export type { Facet, FacetContext, FacetInput, FacetResult, FacetWarning, FacetLayer, FacetStyle } from './types.js';
export type { FacetResolution } from './driver.js';
export { orderFacets, runFacets, runPostAssemble, WarningCollector, engineWarnings } from './driver.js';
export { elevationFacet, ELEVATION_VALUES } from './elevation.js';
export { prominenceFacet, PROMINENCE_VALUES, hasPageSectionHeader } from './prominence.js';
export { contentPlaceFacet } from './content-place.js';
export { coverFacet } from './cover.js';
export { frameFacet, FRAME_FACET_META } from './frame.js';
export { tintFacet, TINT_TOKENS } from './tint.js';
export { bgFacet, buildBgGradient } from './bg.js';
export { widthFacet, contentMeasureFacet, spacingFacet, insetFacet } from './box.js';
export { densityFacet, DENSITY_VALUES } from './density.js';
export { readingFacet, dropcapFacet, READING_REGISTERS, READING_CAPABILITIES, DEFAULT_READING } from './reading.js';
export { motionFacet } from './motion.js';
export { modifiersFacet, contextModifiersFacet, staticModifiersFacet } from './modifiers.js';
export type { DescribableFacet, FacetContract } from './describe.js';

/** Facets that can describe their output statically, for `refrakt contracts`.
 *
 *  Only the config-modifier family: they are the only facets whose output the
 *  structure contract describes at all. See WORK-525. */
export const DESCRIBABLE_FACETS: readonly DescribableFacet[] = [
	modifiersDescribe,
	contextModifiersDescribe,
	staticModifiersDescribe,
];
export { substrateFacet } from './substrate.js';
export { applyChromeToTag, hasMediaSection } from './chrome.js';
export type { Chrome, ChromeCarry, ChromeTarget } from './chrome.js';
export type { FacetTheme } from './types.js';

/** The facet registry, in declaration order.
 *
 *  Registration order is the tie-break for facets with no `after` relationship,
 *  so it is kept identical to the order the axes were resolved in when they
 *  lived inline in `transformRune` — that preserves `modifierValues` key
 *  insertion order and inline-style declaration order, and therefore the
 *  output byte-for-byte.
 *
 *  Migrated so far (SPEC-124): `elevation`, `prominence`, `content-place`,
 *  `cover`, `frame` and `substrate`. Still resolving inline: tint, density,
 *  width/spacing, reading and dropcap, motion, and background.
 *  `FacetResult.layers` is declared but unexercised; it needs the background
 *  facet (WORK-520), the first to build its own element tree. */
const FACETS: readonly Facet[] = [
	// Order reproduces the sequence these axes emitted in when they resolved
	// inline. Class order, `modifierValues` key insertion order and inline-style
	// declaration order are all part of the output, and all follow from this.
	modifiersFacet,
	contextModifiersFacet,
	staticModifiersFacet,
	tintFacet,
	widthFacet,
	contentMeasureFacet,
	spacingFacet,
	insetFacet,
	densityFacet,
	readingFacet,
	dropcapFacet,
	elevationFacet,
	prominenceFacet,
	motionFacet,
	contentPlaceFacet,
	coverFacet,
	frameFacet,
	substrateFacet,
	bgFacet,
];

/** Every author attribute the registry owns, derived once at module load.
 *
 *  The engine strips these from pass-through output. Deriving it from the
 *  facets means adding an axis with a fixed attribute name is a file plus a
 *  registry entry, with no engine edit — which was not true while the list was
 *  hand-maintained in `transformRune` (WORK-526). */
export const FACET_ATTRIBUTES: ReadonlySet<string> = new Set(
	FACETS.flatMap(f => [...(f.attributes ?? [])]),
);

/** Registry ordered once at module load.
 *
 *  A cycle or a dangling `after` throws here — at import, not per transform. */
export const ORDERED_FACETS: readonly Facet[] = orderFacets(FACETS);
