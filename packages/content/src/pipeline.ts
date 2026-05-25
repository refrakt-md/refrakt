import type {
	PluginPipelineHooks,
	TransformedPage,
	EntityRegistry,
	AggregatedData,
	PipelineWarning,
	PipelineContext,
	ContributedPage,
} from '@refrakt-md/types';
import type { SitePage } from './site.js';
import { EntityRegistryImpl } from './registry.js';

/** A package and its pipeline hooks, ready to run */
export interface HookSet {
	pluginName: string;
	hooks: PluginPipelineHooks;
}

/** Options for the contribution phase (SPEC-069). */
export interface RunPipelineOptions {
	/** Render a contributed page's source into a full SitePage (provided by the
	 *  content loader, which owns the parse + transform machinery). */
	renderContributed?: (cp: ContributedPage) => SitePage;
	/** Absolute project root, passed to contributePages hooks. */
	projectRoot?: string;
	/** Per-site config slice, passed to contributePages hooks. */
	siteConfig?: unknown;
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
	options: RunPipelineOptions = {},
): Promise<PipelineResult> {
	const warnings: PipelineWarning[] = [];
	const registry = new EntityRegistryImpl();

	// Working page set — grows as plugins contribute pages (SPEC-069).
	const allPages: SitePage[] = [...pages];
	// Convert SitePage[] → TransformedPage[] (lightweight view, no deep copy)
	const transformedPages: TransformedPage[] = allPages.map(pageToTransformed);

	// ─── Phase 2: Register ───
	for (const { pluginName, hooks } of hookSets) {
		if (!hooks.register) continue;
		const ctx = makeContext(warnings, 'register', pluginName);
		try {
			hooks.register(transformedPages, registry, ctx);
		} catch (err) {
			ctx.error((err as Error).message);
		}
	}

	// ─── Phase 2.5: Contribute pages (SPEC-069) ───
	// Plugins synthesize virtual pages (often from registered entities). They run
	// after register so the registry is populated; contributed pages then flow
	// through register (a second pass, for their own entities) → aggregate →
	// postProcess like file pages. Contributed pages cannot trigger another
	// contribution phase (the graph is one level deep, by design).
	if (options.renderContributed) {
		const fileUrls = new Set(allPages.map((p) => p.route.url));
		const contributedUrls = new Map<string, string>();
		const newPages: SitePage[] = [];
		for (const { pluginName, hooks } of hookSets) {
			if (!hooks.contributePages) continue;
			const ctx = makeContext(warnings, 'contribute', pluginName);
			try {
				const contributed = await hooks.contributePages({
					...ctx,
					registry: registry as Readonly<EntityRegistry>,
					projectRoot: options.projectRoot,
					siteConfig: options.siteConfig,
				});
				contributed.forEach((cp, ruleIndex) => {
					if (fileUrls.has(cp.url)) {
						ctx.warn(`contributed page "${cp.url}" collides with a file-backed page; the file wins`, cp.url);
						return;
					}
					const prior = contributedUrls.get(cp.url);
					if (prior) {
						ctx.error(`contributed page "${cp.url}" collides with one from "${prior}"`, cp.url);
						return;
					}
					contributedUrls.set(cp.url, pluginName);
					const sp = options.renderContributed!({ ...cp, source: { plugin: pluginName, ruleIndex } });
					newPages.push(sp);
				});
			} catch (err) {
				ctx.error((err as Error).message);
			}
		}
		if (newPages.length > 0) {
			const newTransformed = newPages.map(pageToTransformed);
			allPages.push(...newPages);
			transformedPages.push(...newTransformed);
			// Second register pass: index entities the contributed pages themselves
			// declare (so refs/expands elsewhere resolve them). They do not trigger
			// another contribution round.
			for (const { pluginName, hooks } of hookSets) {
				if (!hooks.register) continue;
				const ctx = makeContext(warnings, 'register', pluginName);
				try {
					hooks.register(newTransformed, registry, ctx);
				} catch (err) {
					ctx.error((err as Error).message);
				}
			}
		}
	}

	// ─── Phase 3: Aggregate ───
	const aggregated: AggregatedData = {};
	const frozenRegistry = registry as Readonly<EntityRegistry>;
	for (const { pluginName, hooks } of hookSets) {
		if (!hooks.aggregate) continue;
		const ctx = makeContext(warnings, 'aggregate', pluginName);
		try {
			aggregated[pluginName] = hooks.aggregate(frozenRegistry, ctx);
		} catch (err) {
			ctx.error((err as Error).message);
		}
	}

	// ─── Phase 4: Post-process ───
	let working = [...transformedPages];
	for (const { pluginName, hooks } of hookSets) {
		if (!hooks.postProcess) continue;
		working = working.map((page, i) => {
			const ctx = makeContext(warnings, 'postProcess', pluginName, page.url);
			try {
				return hooks.postProcess!(page, aggregated, ctx);
			} catch (err) {
				ctx.error((err as Error).message);
				return page; // return original on error
			}
		});
	}

	// Merge post-processed renderables back into the SitePage objects (file +
	// contributed). Cast from unknown back to RenderableTreeNodes — postProcess
	// hooks are responsible for returning the same AST node type they received.
	const resultPages = allPages.map((page, i) => ({
		...page,
		renderable: working[i].renderable as typeof page.renderable,
	}));

	// Tally entity count across all registered types
	const entityCount = registry.getTypes().reduce(
		(sum, type) => sum + registry.getAll(type).length,
		0,
	);

	const stats: PipelineStats = {
		pageCount: allPages.length,
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
	pluginName: string,
	url?: string,
): PipelineContext {
	return {
		info(message, infoUrl) {
			warnings.push({ severity: 'info', phase, pluginName, url: infoUrl ?? url, message });
		},
		warn(message, warnUrl) {
			warnings.push({ severity: 'warning', phase, pluginName, url: warnUrl ?? url, message });
		},
		error(message, errUrl) {
			warnings.push({ severity: 'error', phase, pluginName, url: errUrl ?? url, message });
		},
	};
}
