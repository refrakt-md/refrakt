import type { RuneConfig } from '../types.js';

/** The slice of a structure contract a facet can declare from config alone.
 *
 *  Deliberately a narrow, contract-shaped fragment rather than the full
 *  `RuneContract`: a facet describes only what it itself emits. */
export interface FacetContract {
	modifiers?: Record<string, {
		source: string;
		default?: string;
		classPattern?: string;
		dataAttribute: string;
		valueMap?: Record<string, string>;
		mapTarget?: string;
	}>;
	contextModifiers?: Record<string, { suffix: string; selector: string }>;
	staticModifiers?: Array<{ name: string; selector: string }>;
}

/** A facet that can describe its output statically, from config alone.
 *
 *  PROTOTYPE (WORK-525). Static description is a genuinely separate function
 *  from `resolve`: contracts have no rune instance to transform, so `describe`
 *  cannot delegate to `resolve` and the two can drift exactly as `contracts.ts`
 *  drifts from the engine today. Co-locating them makes drift visible to a
 *  reader; it does not make it detectable by CI.
 *
 *  Only the three config-modifier facets implement this, because they are the
 *  only facets whose output the contract describes at all — see the finding
 *  recorded on WORK-525. */
export interface DescribableFacet {
	readonly name: string;
	describe(config: RuneConfig, block: string): FacetContract | null;
}
