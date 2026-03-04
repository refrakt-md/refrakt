import type {
	PackagePipelineHooks,
	TransformedPage,
	EntityRegistry,
	AggregatedData,
	PipelineWarning,
	PipelineContext,
} from '@refrakt-md/types';
import type { SitePage } from './site.js';
import { EntityRegistryImpl } from './registry.js';

/** A package and its pipeline hooks, ready to run */
export interface HookSet {
	packageName: string;
	hooks: PackagePipelineHooks;
}

/** Build-phase statistics from the pipeline run */
export interface PipelineStats {
	/** Total pages processed */
	pageCount: number;
	/** Total entities registered across all packages */
	entityCount: number;
	/** Number of packages that ran at least one hook */
	packageCount: number;
}

/** Result of running the cross-page pipeline */
export interface PipelineResult {
	/** Pages with renderables updated by any postProcess hooks */
	pages: SitePage[];
	/** Cross-page data produced by all aggregate hooks, keyed by package name */
	aggregated: AggregatedData;
	/** Diagnostics collected across all phases */
	warnings: PipelineWarning[];
	/** Counts for build summary output */
	stats: PipelineStats;
}

/**
 * Run phases 2–4 of the cross-page pipeline against a loaded page array.
 *
 * Phase 2 — Register: each hookSet scans all pages, registers named entities
 * Phase 3 — Aggregate: each hookSet builds cross-page indexes from the full registry
 * Phase 4 — Post-process: each hookSet enriches pages using aggregated data
 *
 * Hook execution is ordered: hookSets run in the order they appear in the array.
 * Errors in individual hooks are caught, converted to PipelineWarning entries,
 * and the pipeline continues with the next hook / page.
 */
export async function runPipeline(
	pages: SitePage[],
	hookSets: HookSet[],
): Promise<PipelineResult> {
	const warnings: PipelineWarning[] = [];
	const registry = new EntityRegistryImpl();

	// Convert SitePage[] → TransformedPage[] (lightweight view, no deep copy)
	const transformedPages: TransformedPage[] = pages.map(pageToTransformed);

	// ─── Phase 2: Register ───
	for (const { packageName, hooks } of hookSets) {
		if (!hooks.register) continue;
		const ctx = makeContext(warnings, 'register', packageName);
		try {
			hooks.register(transformedPages, registry, ctx);
		} catch (err) {
			ctx.error((err as Error).message);
		}
	}

	// ─── Phase 3: Aggregate ───
	const aggregated: AggregatedData = {};
	const frozenRegistry = registry as Readonly<EntityRegistry>;
	for (const { packageName, hooks } of hookSets) {
		if (!hooks.aggregate) continue;
		const ctx = makeContext(warnings, 'aggregate', packageName);
		try {
			aggregated[packageName] = hooks.aggregate(frozenRegistry, ctx);
		} catch (err) {
			ctx.error((err as Error).message);
		}
	}

	// ─── Phase 4: Post-process ───
	let working = [...transformedPages];
	for (const { packageName, hooks } of hookSets) {
		if (!hooks.postProcess) continue;
		working = working.map((page, i) => {
			const ctx = makeContext(warnings, 'postProcess', packageName, page.url);
			try {
				return hooks.postProcess!(page, aggregated, ctx);
			} catch (err) {
				ctx.error((err as Error).message);
				return page; // return original on error
			}
		});
	}

	// Merge post-processed renderables back into the original SitePage objects.
	// Cast from unknown back to RenderableTreeNodes — postProcess hooks are responsible
	// for returning the same AST node type they received.
	const resultPages = pages.map((page, i) => ({
		...page,
		renderable: working[i].renderable as typeof page.renderable,
	}));

	// Tally entity count across all registered types
	const entityCount = registry.getTypes().reduce(
		(sum, type) => sum + registry.getAll(type).length,
		0,
	);

	const stats: PipelineStats = {
		pageCount: pages.length,
		entityCount,
		packageCount: hookSets.filter(
			hs => hs.hooks.register || hs.hooks.aggregate || hs.hooks.postProcess
		).length,
	};

	return { pages: resultPages, aggregated, warnings, stats };
}

function pageToTransformed(page: SitePage): TransformedPage {
	return {
		url: page.route.url,
		title: (page.frontmatter.title as string | undefined) ?? '',
		headings: page.headings,
		frontmatter: page.frontmatter as Record<string, unknown>,
		renderable: page.renderable,
	};
}

function makeContext(
	warnings: PipelineWarning[],
	phase: PipelineWarning['phase'],
	packageName: string,
	url?: string,
): PipelineContext {
	return {
		info(message, infoUrl) {
			warnings.push({ severity: 'info', phase, packageName, url: infoUrl ?? url, message });
		},
		warn(message, warnUrl) {
			warnings.push({ severity: 'warning', phase, packageName, url: warnUrl ?? url, message });
		},
		error(message, errUrl) {
			warnings.push({ severity: 'error', phase, packageName, url: errUrl ?? url, message });
		},
	};
}
