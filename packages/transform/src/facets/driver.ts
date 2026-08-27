import type { RendererNode } from '@refrakt-md/types';
import type { Facet, FacetContext, FacetInput, FacetLayer, FacetStyle, FacetWarning } from './types.js';

/** The merged product of every facet that ran, in registry order. */
export interface FacetResolution {
	axes: Record<string, string>;
	state: Record<string, string>;
	classes: string[];
	dataAttrs: Record<string, string>;
	styles: FacetStyle[];
	consumes: string[];
	layers: FacetLayer[];
	/** Per-facet private scratch from `resolve`, keyed by facet name, handed to
	 *  that facet's own `postAssemble`. */
	carry: Map<string, unknown>;
	/** Every warning produced this run, including ones the collector suppressed
	 *  as duplicates — so a test can assert what a facet decided independently
	 *  of what reached the console. */
	warnings: FacetWarning[];
}

/** Emits facet diagnostics, applying per-key dedupe.
 *
 *  Emission is immediate (not deferred to the end of the run) so that console
 *  output keeps the same ordering it had when each facet warned inline. */
export class WarningCollector {
	private readonly seen = new Set<string>();

	emit(warning: FacetWarning): void {
		if (warning.dedupeKey !== undefined) {
			if (this.seen.has(warning.dedupeKey)) return;
			this.seen.add(warning.dedupeKey);
		}
		console.warn(warning.message);
	}

	/** Drop the dedupe memory. Tests use this to run a warn-once path twice. */
	reset(): void {
		this.seen.clear();
	}
}

/** Process-wide collector used by the engine.
 *
 *  Module scope matches the `*_WARNED` sets it replaces, which are also module
 *  scoped — a warn-once fires once per process, not once per page or build. */
export const engineWarnings = new WarningCollector();

export interface OrderFacetsOptions {
	/** Axis names supplied by `FacetInput.seedAxes` rather than by a facet.
	 *  An `after` entry may name one of these, so a migrated facet can declare a
	 *  dependency on a producer that is still inline. */
	readonly seeded?: readonly string[];
}

/** Order facets so every facet follows the ones it declares in `after`.
 *
 *  Deterministic: independent facets keep their registration order. Throws on a
 *  dependency cycle, or on an `after` naming neither a registered facet nor a
 *  declared seed — both are programming errors in a static registry, so they
 *  should fail at startup rather than silently reorder or no-op per transform. */
export function orderFacets(facets: readonly Facet[], options: OrderFacetsOptions = {}): Facet[] {
	const seeded = new Set(options.seeded ?? []);
	const byName = new Map<string, Facet>();
	for (const facet of facets) {
		if (byName.has(facet.name)) {
			throw new Error(`[refrakt] duplicate facet "${facet.name}" in the registry`);
		}
		byName.set(facet.name, facet);
	}

	const ordered: Facet[] = [];
	const state = new Map<string, 'visiting' | 'done'>();

	const visit = (facet: Facet, trail: readonly string[]): void => {
		const seen = state.get(facet.name);
		if (seen === 'done') return;
		if (seen === 'visiting') {
			throw new Error(`[refrakt] facet dependency cycle: ${[...trail, facet.name].join(' → ')}`);
		}
		state.set(facet.name, 'visiting');
		for (const dep of facet.after ?? []) {
			const target = byName.get(dep);
			if (!target) {
				// A seeded axis has no facet to order against — the engine resolves
				// it inline before the facet pass runs, so the constraint is met.
				if (seeded.has(dep)) continue;
				throw new Error(
					`[refrakt] facet "${facet.name}" declares after: "${dep}", which is neither a registered facet nor a seeded axis`,
				);
			}
			visit(target, [...trail, facet.name]);
		}
		state.set(facet.name, 'done');
		ordered.push(facet);
	};

	for (const facet of facets) visit(facet, []);
	return ordered;
}

/** Build the context a facet reads.
 *
 *  Resolution order: an emitted axis wins over internal state, which wins over
 *  a seeded value — so a migrated facet shadows the seed it replaces without
 *  the seed needing to be removed in the same commit. */
function createContext(input: FacetInput, resolution: FacetResolution): FacetContext {
	return {
		...input,
		axis: (name) => resolution.axes[name] ?? resolution.state[name] ?? input.seedAxes?.[name],
	};
}

const emptyResolution = (): FacetResolution => ({
	axes: {}, state: {}, classes: [], dataAttrs: {}, styles: [], consumes: [], layers: [],
	warnings: [], carry: new Map(),
});

/** Run an already-ordered facet list and merge the results.
 *
 *  Later facets see earlier values through `ctx.axis()`, so the list must come
 *  from `orderFacets`. Passing an unordered list is not detected here — order
 *  once at registry construction, not per transform. */
export function runFacets(
	facets: readonly Facet[],
	input: FacetInput,
	collector: WarningCollector,
): FacetResolution {
	const resolution = emptyResolution();
	const ctx = createContext(input, resolution);

	for (const facet of facets) {
		if (facet.appliesTo && !facet.appliesTo(ctx)) continue;
		const result = facet.resolve(ctx);
		if (!result) continue;

		if (result.axes) Object.assign(resolution.axes, result.axes);
		if (result.state) Object.assign(resolution.state, result.state);
		if (result.classes) resolution.classes.push(...result.classes);
		if (result.dataAttrs) Object.assign(resolution.dataAttrs, result.dataAttrs);
		if (result.styles) resolution.styles.push(...result.styles);
		if (result.consumes) resolution.consumes.push(...result.consumes);
		if (result.layers) resolution.layers.push(...result.layers);
		if (result.carry !== undefined) resolution.carry.set(facet.name, result.carry);
		if (result.warnings) {
			resolution.warnings.push(...result.warnings);
			for (const warning of result.warnings) collector.emit(warning);
		}
	}

	return resolution;
}

/** Run the second phase against the assembled children.
 *
 *  Takes a fresh `input` so seeded values reflect state the engine resolved
 *  after `runFacets` returned. `children` is mutated in place. */
export function runPostAssemble(
	facets: readonly Facet[],
	input: FacetInput,
	resolution: FacetResolution,
	children: RendererNode[],
	collector: WarningCollector,
): void {
	const ctx = createContext(input, resolution);
	for (const facet of facets) {
		if (!facet.postAssemble) continue;
		if (facet.appliesTo && !facet.appliesTo(ctx)) continue;
		const warnings = facet.postAssemble(ctx, children, resolution.carry.get(facet.name));
		if (!warnings) continue;
		resolution.warnings.push(...warnings);
		for (const warning of warnings) collector.emit(warning);
	}
}
