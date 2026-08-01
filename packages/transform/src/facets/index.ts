import type { Facet } from './types.js';
import { orderFacets } from './driver.js';
import { elevationFacet } from './elevation.js';
import { prominenceFacet } from './prominence.js';

export type { Facet, FacetContext, FacetInput, FacetResult, FacetWarning, FacetLayer } from './types.js';
export type { FacetResolution } from './driver.js';
export { orderFacets, runFacets, WarningCollector, engineWarnings } from './driver.js';
export { elevationFacet, ELEVATION_VALUES } from './elevation.js';
export { prominenceFacet, PROMINENCE_VALUES, hasPageSectionHeader } from './prominence.js';

/** The facet registry, in declaration order.
 *
 *  Registration order is the tie-break for facets with no `after` relationship,
 *  so it is kept identical to the order the axes were resolved in when they
 *  lived inline in `transformRune` — that keeps `modifierValues` key insertion
 *  order, and therefore attribute order in the output, unchanged.
 *
 *  Prototype scope (SPEC pending): `elevation` and `prominence` only. The
 *  remaining axes — tint, density, width/spacing, reading/dropcap, motion,
 *  background, frame, substrate — still resolve inline in `transformRune`.
 *  `FacetResult.layers` and a post-assembly hook are declared but not yet
 *  exercised; both need the background and frame facets to design properly. */
const FACETS: readonly Facet[] = [
	elevationFacet,
	prominenceFacet,
];

/** Registry ordered once at module load.
 *
 *  A cycle or a dangling `after` throws here — at import, not per transform. */
export const ORDERED_FACETS: readonly Facet[] = orderFacets(FACETS);
