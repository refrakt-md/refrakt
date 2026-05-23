/** Cross-page pipeline types */

/** A page heading (level, text, generated anchor id) */
export interface PipelineHeadingInfo {
	level: number;
	text: string;
	id: string;
}

/**
 * A page after Phase 1 (parse + rune transform), before Phase 4 (post-process).
 * Passed to all three pipeline hooks.
 */
export interface TransformedPage {
	/** Resolved URL for this page (e.g. '/docs/getting-started/') */
	url: string;
	/** Page title from frontmatter */
	title: string;
	/** Headings extracted from the page content */
	headings: PipelineHeadingInfo[];
	/** Raw frontmatter values */
	frontmatter: Record<string, unknown>;
	/**
	 * The page's renderable content after rune transforms.
	 * At pipeline time this holds the framework's native AST node type
	 * (e.g. Markdoc Tag instances), which is serialized to plain objects later.
	 * Typed as unknown to avoid importing framework-specific types here.
	 */
	renderable: unknown;
}

/**
 * A named entity registered during Phase 2 (Register).
 * The id field must be unique within its type.
 */
export interface EntityRegistration {
	/** Entity category (e.g. 'page', 'heading', 'character', 'term') */
	type: string;
	/** Unique identifier within this type (e.g. '/docs/guide/' or '/docs/guide/#intro') */
	id: string;
	/** URL of the page this entity was registered from, when one exists.
	 *  May be `undefined` when the entity isn't reachable via a local page URL
	 *  (e.g. SPEC-064 plan content registered from `plan.dir` outside any
	 *  site's content tree). The xref resolver treats undefined / empty as
	 *  "no usable URL" and falls through to {@link XrefPattern} resolution.
	 *  Empty strings passed at registration are normalized to `undefined`. */
	sourceUrl?: string;
	/** Entity-specific payload */
	data: Record<string, unknown>;
}

/** The site-wide entity registry built during Phase 2 (Register) */
export interface EntityRegistry {
	register(entry: EntityRegistration): void;
	/** All entities of a given type, in registration order */
	getAll(type: string): EntityRegistration[];
	/** All entities of a given type registered from a specific page URL */
	getByUrl(type: string, url: string): EntityRegistration[];
	/** Find a specific entity by type and id */
	getById(type: string, id: string): EntityRegistration | undefined;
	/** All registered entity type names */
	getTypes(): string[];
}

/**
 * Cross-page data produced by aggregate hooks (Phase 3).
 * Keyed by plugin name to prevent collisions between plugins.
 */
export type AggregatedData = Record<string, unknown>;

/** Context object passed to each pipeline hook for emitting structured warnings */
export interface PipelineContext {
	info(message: string, url?: string): void;
	warn(message: string, url?: string): void;
	error(message: string, url?: string): void;
}

/** A diagnostic emitted by a pipeline hook */
export interface PipelineWarning {
	severity: 'info' | 'warning' | 'error';
	phase: 'register' | 'aggregate' | 'postProcess';
	pluginName: string;
	/** Page URL that triggered the warning, if applicable */
	url?: string;
	message: string;
}

/**
 * Build-time cross-page pipeline hooks a Plugin can provide.
 * All three hooks are optional — plugins that don't need cross-page
 * awareness omit this field entirely.
 */
export interface PluginPipelineHooks {
	/**
	 * Phase 2 — Register.
	 * Scan all transformed pages and register named entities in the site-wide registry.
	 * Called once with the full page array after Phase 1 is complete.
	 */
	register?: (
		pages: readonly TransformedPage[],
		registry: EntityRegistry,
		ctx: PipelineContext,
	) => void;

	/**
	 * Phase 3 — Aggregate.
	 * Build cross-page indexes, graphs, or collections from the full registry.
	 * Called once after all register hooks have run.
	 * Return value is stored as aggregated[pluginName].
	 */
	aggregate?: (
		registry: Readonly<EntityRegistry>,
		ctx: PipelineContext,
	) => unknown;

	/**
	 * Phase 4 — Post-process.
	 * Enrich a page's renderable tree using cross-page data from aggregated.
	 * Called once per page, in plugin registration order.
	 * Return the modified page (or the original if no changes needed).
	 */
	postProcess?: (
		page: TransformedPage,
		aggregated: AggregatedData,
		ctx: PipelineContext,
	) => TransformedPage;
}
