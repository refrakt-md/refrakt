import type { SerializedTag } from '@refrakt-md/types';
import type { RuneConfig } from '../types.js';

/** A diagnostic produced by a facet.
 *
 *  Facets return warnings as data rather than calling `console.warn` inline.
 *  The driver's collector owns emission, which gives one dedupe point instead
 *  of a module-level `Set` per call site, and makes the diagnostics assertable
 *  in tests without spying on the console. */
export interface FacetWarning {
	/** Stable machine-readable identifier (kebab-case). */
	code: string;
	/** The exact text emitted to the console. */
	message: string;
	/** When set, the warning is emitted once per key. Omit to warn every time. */
	dedupeKey?: string;
}

/** An element a facet injects into the rune.
 *
 *  Declared for the background/overlay facets that build their own layer
 *  element. Neither facet in this prototype produces one — see the note in
 *  `./index.ts` about what is still unexercised. */
export interface FacetLayer {
	placement: 'before-content';
	element: SerializedTag;
}

/** Everything a facet may produce. All fields optional; the driver merges them. */
export interface FacetResult {
	/** Named axis values. The driver folds these into `modifierValues`, which
	 *  become `data-*` attributes and the lookup key for `config.styles`. */
	axes?: Record<string, string>;
	/** BEM modifier classes for the rune root. */
	classes?: string[];
	/** Data attributes set directly, bypassing the axis channel. */
	dataAttrs?: Record<string, string>;
	/** Inline custom properties for the rune root. */
	styles?: Record<string, string>;
	/** Meta field names this facet consumed — stripped from the output tree. */
	consumes?: string[];
	/** Elements injected into the rune. */
	layers?: FacetLayer[];
	/** Diagnostics, emitted by the driver's collector. */
	warnings?: FacetWarning[];
}

/** The read-only view a facet gets of the rune being transformed. */
export interface FacetContext {
	readonly tag: SerializedTag;
	readonly config: RuneConfig;
	/** Prefixed BEM block, e.g. `rf-hero`. */
	readonly block: string;
	/** The rune's authored name (`data-rune`), falling back to `block`. Used in
	 *  diagnostics so messages name what the author wrote. */
	readonly rune: string;
	readonly parentRune?: string;
	/** Axes resolved by facets ordered before this one. The only channel for
	 *  cross-facet reads — a facet must declare `after` to rely on a value. */
	axis(name: string): string | undefined;
}

/** Context fields supplied by the caller; `axis` is provided by the driver. */
export type FacetInput = Omit<FacetContext, 'axis'>;

/** One universal axis of the identity transform (elevation, reading, bg, …). */
export interface Facet {
	/** Unique registry key, also the `after` reference. */
	readonly name: string;
	/** Facets whose axes this one reads. The driver topologically sorts on this
	 *  and rejects cycles, so ordering is declared rather than implied by the
	 *  physical line order of a single long function. */
	readonly after?: readonly string[];
	/** Cheap bail-out evaluated before `resolve`. */
	appliesTo?(ctx: FacetContext): boolean;
	/** Resolve the axis. Return `null` when the facet contributes nothing. */
	resolve(ctx: FacetContext): FacetResult | null;
}
