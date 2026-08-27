import type { Facet } from './types.js';
import { orderFacets } from './driver.js';
import { elevationFacet } from './elevation.js';
import { prominenceFacet } from './prominence.js';
import { contentPlaceFacet } from './content-place.js';
import { coverFacet } from './cover.js';
import { frameFacet } from './frame.js';
import { substrateFacet } from './substrate.js';

export type { Facet, FacetContext, FacetInput, FacetResult, FacetWarning, FacetLayer, FacetStyle } from './types.js';
export type { FacetResolution, OrderFacetsOptions } from './driver.js';
export { orderFacets, runFacets, runPostAssemble, WarningCollector, engineWarnings } from './driver.js';
export { elevationFacet, ELEVATION_VALUES } from './elevation.js';
export { prominenceFacet, PROMINENCE_VALUES, hasPageSectionHeader } from './prominence.js';
export { contentPlaceFacet } from './content-place.js';
export { coverFacet } from './cover.js';
export { frameFacet, FRAME_FACET_META } from './frame.js';
export { substrateFacet } from './substrate.js';
export { applyChromeToTag, hasMediaSection } from './chrome.js';
export type { Chrome, ChromeCarry, ChromeTarget } from './chrome.js';
export type { FacetTheme } from './types.js';

/** Axis values still resolved inline in `transformRune` and handed to facets
 *  through `FacetInput.seedAxes`.
 *
 *  Interim migration scaffolding. `media-position` and `content-place` come
 *  from the generic config-modifier loop; `color-scheme` reports whether tint
 *  or the bg layer already claimed the scheme. Each entry disappears when its
 *  producer becomes a facet — a facet-supplied value shadows the seed of the
 *  same name, so consumers need no edit when that happens. */
export const SEEDED_AXES = ['media-position', 'content-place', 'color-scheme'] as const;

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
	elevationFacet,
	prominenceFacet,
	contentPlaceFacet,
	coverFacet,
	// Chrome last: their `--frame-*` / `--substrate-*` declarations followed the
	// cover block's when they resolved inline, and inline-style order is part of
	// the output.
	frameFacet,
	substrateFacet,
];

/** Registry ordered once at module load.
 *
 *  A cycle or a dangling `after` throws here — at import, not per transform. */
export const ORDERED_FACETS: readonly Facet[] = orderFacets(FACETS, { seeded: SEEDED_AXES });
