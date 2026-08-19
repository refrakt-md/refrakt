import type { SerializedTag, RendererNode } from '@refrakt-md/types';
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
 *  element. No migrated facet produces one yet — see `./index.ts`. */
export interface FacetLayer {
	placement: 'before-content';
	element: SerializedTag;
}

/** An inline custom-property declaration, as an ordered `[prop, value]` pair.
 *
 *  Ordered pairs rather than a `Record` because the engine relies on duplicate
 *  declarations resolving last-wins in CSS: `cover` deliberately re-declares
 *  `--cover-scrim-dir` after `content-place` has set it, and a keyed map would
 *  silently collapse the two into one. */
export type FacetStyle = [prop: string, value: string];

/** Everything a facet may produce. All fields optional; the driver merges them. */
export interface FacetResult {
	/** Named axis values, emitted as `data-*` attributes and used as the lookup
	 *  key for `config.styles`. Use `state` for values that must not reach the
	 *  output. */
	axes?: Record<string, string>;
	/** Cross-facet values that are NOT emitted — internal resolution state such
	 *  as "this rune is in cover mode". Readable by later facets through
	 *  `ctx.axis()`, exactly like an emitted axis. */
	state?: Record<string, string>;
	/** BEM modifier classes for the rune root. */
	classes?: string[];
	/** Data attributes set directly, bypassing the axis channel. */
	dataAttrs?: Record<string, string>;
	/** Inline custom properties for the rune root, in declaration order. */
	styles?: FacetStyle[];
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
	/** A value resolved earlier in this run: an emitted axis, internal state, or
	 *  a seeded value from code that has not been migrated to a facet yet. The
	 *  only channel for cross-facet reads — a facet must declare `after` to rely
	 *  on one. */
	axis(name: string): string | undefined;
}

/** Context fields supplied by the caller; `axis` is provided by the driver. */
export interface FacetInput extends Omit<FacetContext, 'axis'> {
	/** Values produced by code still resolving inline in `transformRune`.
	 *
	 *  Interim migration scaffolding: it lets a migrated facet depend on an
	 *  un-migrated producer through the same `ctx.axis()` channel it will use
	 *  once that producer becomes a facet, so consumers need no edit when it
	 *  does. Seeded values are readable but never emitted — they are already in
	 *  the engine's own accumulators. Each entry should disappear as its
	 *  producer migrates. */
	readonly seedAxes?: Readonly<Record<string, string | undefined>>;
}

/** One universal axis of the identity transform (elevation, reading, bg, …). */
export interface Facet {
	/** Unique registry key, also the `after` reference. */
	readonly name: string;
	/** Facets — or seeded axes — whose values this one reads. The driver
	 *  topologically sorts on this and rejects cycles, so ordering is declared
	 *  rather than implied by the physical line order of one long function. */
	readonly after?: readonly string[];
	/** Cheap bail-out evaluated before `resolve`. */
	appliesTo?(ctx: FacetContext): boolean;
	/** Resolve the axis. Return `null` when the facet contributes nothing. */
	resolve(ctx: FacetContext): FacetResult | null;
	/** Second phase, run after the rune's children have been assembled.
	 *
	 *  For contributions that cannot be expressed against the unassembled tag —
	 *  `cover` flipping the colour scheme on the assembled `content` overlay,
	 *  and (once migrated) frame/substrate chrome landing on the media zone.
	 *  Mutates `children` in place; the return value is ignored. */
	postAssemble?(ctx: FacetContext, children: RendererNode[]): void;
}
