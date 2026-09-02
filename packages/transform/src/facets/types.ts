import type { SerializedTag, RendererNode } from '@refrakt-md/types';
import type { RuneConfig, TintDefinition, BgPresetDefinition, FramePresetDefinition } from '../types.js';

/** Theme-level preset registries a facet may resolve a named preset against.
 *
 *  Only the registries a migrated facet actually reads are declared. The rune
 *  registry (`allRunes` / `runeKeyMap`) that `density` needs to look up a
 *  parent's `childDensity` is a different kind of lookup and is added when that
 *  axis migrates. */
export interface FacetTheme {
	readonly tints: Record<string, TintDefinition>;
	readonly backgrounds: Record<string, BgPresetDefinition>;
	readonly frames: Record<string, FramePresetDefinition>;
}

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
	/** Author *attribute* names the facet consumed, removed from pass-through
	 *  output. Distinct from `consumes`, which claims `<meta data-field>`
	 *  children. Used by the config-modifier facet, whose attribute names come
	 *  from the rune's own config and so cannot be a fixed list. */
	stripAttrs?: string[];
	/** Elements injected into the rune. */
	layers?: FacetLayer[];
	/** Nodes the facet took ownership of, removed from the rune's normal flow.
	 *
	 *  Relocation is two halves: `layers` puts the new subtree in, `absorbs`
	 *  takes the original out. The background facet moves a `{% bg %}` sandbox
	 *  guest from the host's children into the background layer, and without
	 *  this the guest would render twice. Matched by identity, not by value. */
	absorbs?: SerializedTag[];
	/** Diagnostics, emitted by the driver's collector. */
	warnings?: FacetWarning[];
	/** Private scratch handed back to this facet's own `postAssemble`.
	 *
	 *  For a facet whose two phases share resolved work that is neither emitted
	 *  nor expressible as a string — `frame` resolves its chrome bundle and its
	 *  target surface in `resolve`, then applies them to the media zone once it
	 *  exists. The alternative is re-resolving in the second phase, which
	 *  duplicates the work and risks the two phases disagreeing. Opaque to the
	 *  driver; each facet casts its own. */
	carry?: unknown;
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
	/** The nearest ancestor rune's resolved config, when there is one.
	 *
	 *  `density` inherits from a parent's `childDensity`, making it the first
	 *  axis to need more than the current rune's own config. Supplied as the
	 *  resolved config rather than as the rune registry, so a facet cannot reach
	 *  arbitrarily into the rune graph. */
	readonly parentConfig?: RuneConfig;
	/** The parsed SPEC-082 `data-rune-fields` bag, the typed channel modifier
	 *  values are read from. Parsed once by the engine rather than per facet. */
	readonly fields: Record<string, unknown>;
	/** Theme preset registries, for facets that resolve a named preset. */
	readonly theme: FacetTheme;
	/** A value resolved earlier in this run: an emitted axis or internal state.
	 *  The only channel for cross-facet reads — a facet must declare `after` to
	 *  rely on one. */
	axis(name: string): string | undefined;
}

/** Context fields supplied by the caller; `axis` is provided by the driver. */
export type FacetInput = Omit<FacetContext, 'axis'>;

/** One universal axis of the identity transform (elevation, reading, bg, …). */
export interface Facet {
	/** Unique registry key, also the `after` reference. */
	readonly name: string;
	/** Facets whose values this one reads. The driver topologically sorts on
	 *  this and rejects cycles, so ordering is declared rather than implied by
	 *  the physical line order of one long function. */
	readonly after?: readonly string[];
	/** Author attribute names this facet owns, never passed through to output.
	 *
	 *  Static rather than a `FacetResult` field, because these must be stripped
	 *  even when the facet resolves to nothing: `width="content"` is suppressed
	 *  (no axis, no class) but must not reach the rendered element. A
	 *  per-instance result channel cannot express that; `FacetResult.stripAttrs`
	 *  covers the config-modifier case, whose names are not knowable statically. */
	readonly attributes?: readonly string[];
	/** Cheap bail-out evaluated before `resolve`. */
	appliesTo?(ctx: FacetContext): boolean;
	/** Resolve the axis. Return `null` when the facet contributes nothing. */
	resolve(ctx: FacetContext): FacetResult | null;
	/** Second phase, run after the rune's children have been assembled.
	 *
	 *  For contributions that cannot be expressed against the unassembled tag —
	 *  `cover` flipping the colour scheme on the assembled `content` overlay,
	 *  `frame` and `substrate` landing their chrome on the media zone. Mutates
	 *  `children` in place. `carry` is whatever this facet's own `resolve`
	 *  returned in `FacetResult.carry`.
	 *
	 *  Returns diagnostics as data, exactly as `resolve` does — some conditions
	 *  are only detectable against the assembled tree (a `media`-target chrome
	 *  finding no media zone), and routing those through the console directly
	 *  would make them untestable and bypass the collector's dedupe. */
	postAssemble?(ctx: FacetContext, children: RendererNode[], carry: unknown): FacetWarning[] | void;
}
