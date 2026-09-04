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
import { elevationAxis } from './elevation.js';
import { prominenceAxis } from './prominence.js';
import { contentPlaceAxis } from './content-place.js';
import { coverAxis } from './cover.js';
import { frameAxis } from './frame.js';
import { substrateAxis } from './substrate.js';
import { tintAxis } from './tint.js';
import { bgAxis } from './bg.js';
import { widthAxis, contentMeasureAxis, spacingAxis, insetAxis } from './box.js';
import { densityAxis } from './density.js';
import { readingAxis, dropcapAxis } from './reading.js';
import { motionAxis } from './motion.js';
import type { DescribableFacet, UniversalAxisFacet } from './describe.js';

export type { Facet, FacetContext, FacetInput, FacetResult, FacetWarning, FacetLayer, FacetStyle } from './types.js';
export type { FacetResolution } from './driver.js';
export { orderFacets, runFacets, runPostAssemble, WarningCollector } from './driver.js';
export { elevationFacet, elevationAxis, ELEVATION_VALUES } from './elevation.js';
export { prominenceFacet, prominenceAxis, PROMINENCE_VALUES, hasPageSectionHeader } from './prominence.js';
export { contentPlaceFacet, contentPlaceAxis } from './content-place.js';
export { coverFacet, coverAxis } from './cover.js';
export { frameFacet, frameAxis, FRAME_FACET_META } from './frame.js';
export { tintFacet, tintAxis, TINT_TOKENS } from './tint.js';
export { bgFacet, bgAxis, buildBgGradient } from './bg.js';
export { widthFacet, contentMeasureFacet, spacingFacet, insetFacet } from './box.js';
export { widthAxis, contentMeasureAxis, spacingAxis, insetAxis } from './box.js';
export { densityFacet, densityAxis, DENSITY_VALUES } from './density.js';
export { readingFacet, dropcapFacet, readingAxis, dropcapAxis, READING_REGISTERS, READING_CAPABILITIES, DEFAULT_READING } from './reading.js';
export { motionFacet, motionAxis } from './motion.js';
export { modifiersFacet, contextModifiersFacet, staticModifiersFacet } from './modifiers.js';
export type { DescribableFacet, FacetContract, UniversalAxisFacet, UniversalAxisContract, RuneAxisContract } from './describe.js';

/** Facets that describe their config-modifier output statically, for
 *  `refrakt contracts`.
 *
 *  Only the config-modifier family — the universal axes describe themselves
 *  through {@link UNIVERSAL_AXIS_FACETS} instead, because their output is
 *  mostly the same on every rune and only the gates and defaults vary.
 *  See WORK-525. */
export const DESCRIBABLE_FACETS: readonly DescribableFacet[] = [
	modifiersDescribe,
	contextModifiersDescribe,
	staticModifiersDescribe,
];

/** The universal axes, in registry order, for the structure contract.
 *
 *  Ordered to match {@link ORDERED_FACETS} so the contract reads in the order
 *  the engine resolves — which is also the order duplicate CSS declarations
 *  resolve in (`content-place` then `cover` both write `--cover-scrim-dir`).
 *
 *  Adding an axis to the registry and forgetting to add it here is the drift
 *  this list can still have; `contract-engine-agreement.test.ts` covers the
 *  claims each entry makes, and `facets/registry.test.ts` covers the coverage
 *  of the list itself. */
export const UNIVERSAL_AXIS_FACETS: readonly UniversalAxisFacet[] = [
	tintAxis,
	widthAxis,
	contentMeasureAxis,
	spacingAxis,
	insetAxis,
	densityAxis,
	readingAxis,
	dropcapAxis,
	elevationAxis,
	prominenceAxis,
	motionAxis,
	contentPlaceAxis,
	coverAxis,
	frameAxis,
	substrateAxis,
	bgAxis,
];
export { substrateFacet, substrateAxis } from './substrate.js';
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
 *  Every universal axis has migrated (SPEC-124); nothing resolves inline in
 *  `transformRune` any more. */
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
