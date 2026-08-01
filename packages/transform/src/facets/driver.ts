import type { Facet, FacetContext, FacetInput, FacetLayer, FacetWarning } from './types.js';

/** The merged product of every facet that ran, in registry order. */
export interface FacetResolution {
	axes: Record<string, string>;
	classes: string[];
	dataAttrs: Record<string, string>;
	styles: Record<string, string>;
	consumes: string[];
	layers: FacetLayer[];
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
 *  scoped — a warn-once fires once per process, not once per page. */
export const engineWarnings = new WarningCollector();

/** Order facets so every facet follows the ones it declares in `after`.
 *
 *  Deterministic: independent facets keep their registration order. Throws on a
 *  dependency cycle or an `after` naming an unregistered facet — both are
 *  programming errors in a static registry, so they should fail at startup
 *  rather than silently reorder or no-op at transform time. */
export function orderFacets(facets: readonly Facet[]): Facet[] {
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
				throw new Error(`[refrakt] facet "${facet.name}" declares after: "${dep}", which is not registered`);
			}
			visit(target, [...trail, facet.name]);
		}
		state.set(facet.name, 'done');
		ordered.push(facet);
	};

	for (const facet of facets) visit(facet, []);
	return ordered;
}

/** Run an already-ordered facet list and merge the results.
 *
 *  Later facets see earlier axes through `ctx.axis()`, so the list must come
 *  from `orderFacets`. Passing an unordered list is not detected here — order
 *  once at registry construction, not per transform. */
export function runFacets(
	facets: readonly Facet[],
	input: FacetInput,
	collector: WarningCollector,
): FacetResolution {
	const resolution: FacetResolution = {
		axes: {}, classes: [], dataAttrs: {}, styles: {}, consumes: [], layers: [], warnings: [],
	};

	const ctx: FacetContext = {
		...input,
		axis: (name) => resolution.axes[name],
	};

	for (const facet of facets) {
		if (facet.appliesTo && !facet.appliesTo(ctx)) continue;
		const result = facet.resolve(ctx);
		if (!result) continue;

		if (result.axes) Object.assign(resolution.axes, result.axes);
		if (result.classes) resolution.classes.push(...result.classes);
		if (result.dataAttrs) Object.assign(resolution.dataAttrs, result.dataAttrs);
		if (result.styles) Object.assign(resolution.styles, result.styles);
		if (result.consumes) resolution.consumes.push(...result.consumes);
		if (result.layers) resolution.layers.push(...result.layers);
		if (result.warnings) {
			resolution.warnings.push(...result.warnings);
			for (const warning of result.warnings) collector.emit(warning);
		}
	}

	return resolution;
}
