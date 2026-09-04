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
 *  Static description is a genuinely separate function from `resolve`:
 *  contracts have no rune instance to transform, so `describe` cannot delegate
 *  to `resolve` and the two can drift exactly as `contracts.ts` drifts from the
 *  engine today. Co-locating them makes drift visible to a reader;
 *  `contract-engine-agreement.test.ts` is what makes it detectable by CI.
 *
 *  The three config-modifier facets implement this. The universal axes describe
 *  themselves through {@link UniversalAxisFacet} instead — a different shape,
 *  because a universal axis is mostly the *same* on every rune and only its
 *  gates and defaults vary. */
export interface DescribableFacet {
	readonly name: string;
	describe(config: RuneConfig, block: string): FacetContract | null;
}

/** One universal axis, as the registry defines it — config-independent.
 *
 *  Selector patterns use a `{block}` placeholder (and `{value}` where the class
 *  carries the value): the description is stated once for the whole contract
 *  rather than per rune, and `RuneContract.block` substitutes it.
 *
 *  This is the shape WORK-527 added. Before it, `refrakt contracts` claimed to
 *  describe "the complete HTML structure the identity transform produces" while
 *  saying nothing at all about `[data-elevation]`, `.rf-card--tinted`,
 *  `.rf-hero--has-bg`, `[data-reveal]` or `[data-substrate]`. */
export interface UniversalAxisContract {
	/** One line on what the axis does. */
	description: string;
	/** Where the author's input is read from: an attribute on the rune tag, a
	 *  `<meta data-field>` child, or the rune's own config. */
	source: 'attribute' | 'meta' | 'config';
	/** Input names. `{token}` expands over `tokens`. */
	inputs: readonly string[];
	/** Vocabulary for the `{token}` placeholder in `inputs`/`customProperties`. */
	tokens?: readonly string[];
	/** Closed value vocabulary, where the engine owns one. Absent when the
	 *  engine passes any value through and the closed set (if any) is enforced
	 *  by the schema layer instead. */
	values?: readonly string[];
	/** Value in effect when the author sets nothing. */
	default?: string;
	/** Fixed classes the axis adds, with a `{block}` placeholder. */
	selectors?: readonly string[];
	/** Class shape when the class carries the axis value. */
	classPattern?: string;
	/** Attributes the axis emits on the surface it lands on. */
	dataAttributes?: readonly string[];
	/** CSS custom properties the axis sets. */
	customProperties?: readonly string[];
	/** Elements the axis injects, as selectors. */
	elements?: readonly string[];
	/** Where the axis lands, when it is not the rune root. */
	target?: string;
	/** When the axis is gated. Mirrors the `condition` on `elements` entries. */
	condition?: string;
}

/** What one rune's config settles about a universal axis.
 *
 *  Only the parts that *vary* by rune — the rest is stated once at the top
 *  level of the contract. An axis with nothing rune-specific to say is absent
 *  from the rune's `universalAxes.axes`, which means "as described at the top
 *  level", not "unavailable"; unavailability is recorded separately, in
 *  `universalAxes.unavailable`. */
export interface RuneAxisContract {
	/** The resolved default for this rune, when its config sets one. */
	default?: string;
	/** Block-substituted selectors, for axes whose class is fixed rather than
	 *  value-derived (`--tinted`, `--has-bg`). */
	selectors?: readonly string[];
	/** The surface the axis lands on for this rune, when config chooses it. */
	target?: string;
}

/** A universal axis that can describe itself for the structure contract.
 *
 *  Split in two because the two halves have different lifetimes: `describeAxis`
 *  is the registry's own definition and is emitted once per contract, while
 *  `describeForRune` is per rune and deliberately narrow — see
 *  {@link RuneAxisContract}. */
export interface UniversalAxisFacet {
	/** Axis name, as it appears in the contract. Matches the facet name. */
	readonly axis: string;
	/** The registry-level description. Config-independent. */
	describeAxis(): UniversalAxisContract;
	/** What this rune's config settles. `null` when nothing does.
	 *
	 *  A string result means the axis is *unavailable* on this rune and the
	 *  string is why — recorded as one line in `universalAxes.unavailable`
	 *  rather than as an object, because there are hundreds of them across the
	 *  catalog and the reason is the only payload. */
	describeForRune(config: RuneConfig, block: string): RuneAxisContract | string | null;
}
