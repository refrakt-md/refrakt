/** Cross-page pipeline types */

import type { ProjectFiles } from './project-files.js';

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
 * Identity within the registry is `(type, id)` for site-scoped entries
 * (the default and back-compatible shape), or `(type, sourceUrl, id)` for
 * page-scoped entries (where two pages may legitimately reuse the same id).
 */
export interface EntityRegistration {
	/** Entity category (e.g. 'page', 'heading', 'character', 'term') */
	type: string;
	/** Identifier. Unique within its type when `scope` is `'site'` (the default);
	 *  unique within `(type, sourceUrl)` when `scope` is `'page'`. */
	id: string;
	/** Registration scope. `'site'` (default) means the entity is globally
	 *  addressable across the build — two registrations with the same
	 *  `(type, id)` collide and the last one wins. `'page'` means the entity
	 *  is local to the page it was registered from (its {@link sourceUrl}):
	 *  the registry namespaces the entry by URL internally so two pages can
	 *  legitimately register the same `(type, id)` without collision. Page-
	 *  scoped entries are still discoverable via {@link EntityRegistry.getAll}
	 *  and {@link EntityRegistry.getByUrl}; {@link EntityRegistry.getById}
	 *  needs the calling page's URL to match them, falling back to a site-
	 *  scoped match if no page-scoped one exists. */
	scope?: 'page' | 'site';
	/** URL of the page this entity was registered from, when one exists.
	 *  May be `undefined` when the entity isn't reachable via a local page URL
	 *  (e.g. SPEC-064 plan content registered from `plan.dir` outside any
	 *  site's content tree). The xref resolver treats undefined / empty as
	 *  "no usable URL" and falls through to {@link XrefPattern} resolution.
	 *  Empty strings passed at registration are normalized to `undefined`.
	 *  Required in practice for `scope: 'page'` — page-scoped entries
	 *  without a URL fall back to site-scoped keying (with a likely
	 *  collision warning from the registry implementation). */
	sourceUrl?: string;
	/** Project-root-relative path to the source `.md` file backing this entity.
	 *  Populated by plugins that can extract content from disk (e.g. the plan
	 *  plugin's unconditional-scan path). Consumed by content-embedding runes
	 *  like {% expand %} (SPEC-066) that need to read and slice the source
	 *  file at build time. Optional — entities registered from in-memory
	 *  sources or pages without a stable file path may omit it. */
	sourceFile?: string;
	/** Function returning the entity's top-level AST node from a freshly-
	 *  parsed source file, or `null` if the file's structure has been edited
	 *  away from the expected shape. Consumed by {% expand %} (SPEC-066) to
	 *  extract the entity's subtree for inline substitution. Optional and
	 *  paired with `sourceFile` — entities without a backing file omit both. */
	extract?: (parsedSource: import('@markdoc/markdoc').Node) => import('@markdoc/markdoc').Node | null;
	/** Return the entity's embeddable content as a Markdoc AST node directly,
	 *  without reading a source file (SPEC-069). The generalization of
	 *  `sourceFile` + `extract`: an entity is embeddable via `embed()` *or*
	 *  (`sourceFile` + `extract`). Plugins backed by in-memory / external data
	 *  (no file on disk) provide `embed()`; file-backed plugins keep
	 *  `sourceFile` + `extract`. Consumed by {% expand %}. */
	embed?: () => import('@markdoc/markdoc').Node | null;
	/** Entity-specific payload */
	data: Record<string, unknown>;
}

/** A directed, typed relationship edge between two entities (SPEC-072).
 *  `kind` is an arbitrary, domain-defined string (e.g. `implements`,
 *  `blocked-by`, `ally`). Bidirectional relationships are expressed by
 *  contributing both directions, so "every edge touching X" is X's outgoing
 *  edges. `fromType`/`toType` are optional hints that speed up target
 *  resolution; when absent the registry resolves `toId` by scanning types. */
export interface EntityEdge {
	fromId: string;
	toId: string;
	kind: string;
	fromType?: string;
	toType?: string;
}

/** An edge with its target entity resolved, returned by
 *  {@link EntityRegistry.getRelated}. */
export interface ResolvedEdge {
	kind: string;
	fromId: string;
	toId: string;
	target: EntityRegistration;
}

/** The site-wide entity registry built during Phase 2 (Register) */
export interface EntityRegistry {
	register(entry: EntityRegistration): void;
	/** All entities of a given type, in registration order. Mixed scopes —
	 *  page-scoped and site-scoped entries appear together. */
	getAll(type: string): EntityRegistration[];
	/** All entities of a given type registered from a specific page URL.
	 *  Includes both page-scoped and site-scoped entries from that page. */
	getByUrl(type: string, url: string): EntityRegistration[];
	/** Find a specific entity by type and id. When `pageUrl` is provided,
	 *  page-scoped entries from that page take precedence over site-scoped
	 *  matches of the same id; if no page-scoped match exists the search
	 *  falls back to a site-scoped match. Without `pageUrl` only site-scoped
	 *  entries are returned. */
	getById(type: string, id: string, pageUrl?: string): EntityRegistration | undefined;
	/** All registered entity type names */
	getTypes(): string[];
	/** Contribute a relationship edge to the graph (SPEC-072). Called by
	 *  plugins during the aggregate phase. Exact `(fromId, toId, kind)`
	 *  duplicates are deduped. Optional — a minimal registry need not carry a
	 *  relationship graph. */
	relate?(edge: EntityEdge): void;
	/** Edges whose `fromId` is `id`, each with its target resolved (SPEC-072).
	 *  `opts.kind` / `opts.type` filter by edge kind and target entity type.
	 *  Edges to unknown entities are dropped. Optional — see {@link relate}. */
	getRelated?(id: string, opts?: { kind?: string | string[]; type?: string | string[] }): ResolvedEdge[];
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
	phase: 'register' | 'contribute' | 'aggregate' | 'postProcess';
	pluginName: string;
	/** Page URL that triggered the warning, if applicable */
	url?: string;
	message: string;
}

/** Per-build configuration handed to {@link PluginPipelineHooks.configure}.
 *  Plugins that need access to the full `refrakt.config.json` (e.g. the plan
 *  plugin needs `plan.dir` for its unconditional-scan path) read it here. */
export interface PluginConfigureOptions {
	/** The full, normalized refrakt config. Typed as `unknown` here to avoid
	 *  a circular import between pipeline.ts and theme.ts; plugins cast to
	 *  `RefraktConfig` from `@refrakt-md/types`. */
	config: unknown;
	/** Absolute path to the directory containing `refrakt.config.json`.
	 *  Useful for resolving config-relative paths (`plan.dir`, etc.). */
	configDir: string;
	/** The project's files (SPEC-113). A plugin that scans the project at
	 *  configure time (e.g. the plan plugin reading `plan.dir`) reads through
	 *  this provider so a hosted in-memory build stays fs-free. Undefined when
	 *  no provider is wired — the plugin falls back to direct `fs`. */
	projectFiles?: ProjectFiles;
	/** Dynamically register a file-root namespace. Use this when the plugin's
	 *  contribution depends on user config (e.g., the plan plugin registers
	 *  `plan:` pointing at the user's `plan.dir`, which isn't knowable
	 *  statically from the plugin's package directory). Roots registered
	 *  here merge with `Plugin.fileRoots` and user-config `fileRoots`; user
	 *  config still wins any namespace collision. */
	registerFileRoot?: (namespace: string, absolutePath: string) => void;
}

/** Per-page context handed to {@link PluginPipelineHooks.preprocess}.
 *  Extends {@link PipelineContext} with the file-system + project-root
 *  information preprocess hooks need to do sandboxed file reads. Variables
 *  from the transform `config.variables` aren't available yet (the
 *  transform hasn't run), so file-reading preprocessors that need disk
 *  access read here. */
export interface PreprocessContext extends PipelineContext {
	/** Absolute path to the project root (the directory containing
	 *  `refrakt.config.json`). The snippet rune uses this as its sandbox
	 *  anchor; any preprocessor that resolves files relative to the project
	 *  root reads it here. */
	projectRoot?: string;
	/** The project's files, as a {@link ProjectFiles} provider (SPEC-113).
	 *  Preprocess runs before the transform config exists, so the same provider
	 *  the transform-time sandbox reads through is exposed here for any
	 *  file-reading preprocessor. Keys are normalized POSIX project-root-relative
	 *  paths; containment is the provider's contract. */
	sandbox?: ProjectFiles;
	/** Markdoc variables that would otherwise be available to transforms
	 *  via `config.variables`. Snippet's preprocess uses these to resolve
	 *  attribute values that come in as Markdoc `Variable` nodes (e.g.
	 *  `path=$file.path` parses as a variable reference, not a string).
	 *  Variable nodes that aren't resolvable here render as empty strings,
	 *  matching transform-time behaviour. */
	variables?: Record<string, unknown>;
}

/** Per-page metadata handed to {@link PluginPipelineHooks.preprocess}. */
export interface PreprocessPage {
	/** Resolved URL for this page. */
	url: string;
	/** Path relative to the content root. */
	relativePath: string;
	/** Absolute filesystem path to the source `.md` file. */
	filePath: string;
}

/**
 * Build-time cross-page pipeline hooks a Plugin can provide.
 * All hooks are optional — plugins that don't need cross-page awareness
 * omit this field entirely.
 */
export interface PluginPipelineHooks {
	/** Phase −1 — Configure.
	 *  Runs once per build before any other hook, receiving the user's
	 *  `refrakt.config.json` and the config-file directory. Plugins that need
	 *  build-time configuration (e.g. plan reading `plan.dir`) wire it up
	 *  here. Sync or async; the loader awaits the promise. */
	configure?: (opts: PluginConfigureOptions) => void | Promise<void>;

	/** Phase 0 — Preprocess.
	 *  Runs per page on the parsed Markdoc AST before the schema-driven
	 *  transform. Hooks may rewrite the AST (replace tags with other node
	 *  types, inject nodes, resolve include-style references). The returned
	 *  AST is the one passed to the transform. Return `undefined` (or `void`)
	 *  to leave the AST unchanged.
	 *
	 *  Use sparingly — most concerns belong in transforms or postProcess
	 *  hooks. Preprocess is for cases where the rune needs to be invisible
	 *  to downstream transforms (e.g., snippet → fence so container runes
	 *  don't need per-rune awareness). */
	preprocess?: (
		ast: import('@markdoc/markdoc').Node,
		page: PreprocessPage,
		ctx: PreprocessContext,
	) => import('@markdoc/markdoc').Node | void | Promise<import('@markdoc/markdoc').Node | void>;

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
	 * Phase 2.5 — Contribute pages (SPEC-069).
	 * Synthesize virtual pages (from registered entities or external data) that
	 * flow through the rest of the pipeline exactly like file-backed pages.
	 * Runs after register (so the registry is populated) and before aggregate.
	 * Sync or async; the loader awaits the promise. Errors are caught and the
	 * plugin's contributions are skipped with a build warning.
	 */
	contributePages?: (
		ctx: ContributePagesContext,
	) => ContributedPage[] | Promise<ContributedPage[]>;

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

/** Context handed to {@link PluginPipelineHooks.contributePages} (SPEC-069). */
export interface ContributePagesContext extends PipelineContext {
	/** The registry after Phase 2 — read entities to derive routes. */
	registry: Readonly<EntityRegistry>;
	/** Absolute path to the project root, for resolving config-relative paths. */
	projectRoot?: string;
	/** The per-site config slice (typed `unknown` to avoid a circular import;
	 *  the built-in entityRoutes adapter casts to `SiteConfig`). */
	siteConfig?: unknown;
}

/** A page synthesized by a plugin (SPEC-069). The framework parses + transforms
 *  it and runs it through register / aggregate / postProcess like a file page. */
export interface ContributedPage {
	/** Site-root-relative route (basePath is applied by the loader). */
	url: string;
	/** Page title; falls back to the rendered content's heading when omitted. */
	title?: string;
	/** Frontmatter for the synthesized page. */
	frontmatter?: Record<string, unknown>;
	/** Markdoc source for the page body. */
	content: string;
	/** Extra markdoc variables bound when transforming the page body (e.g. the
	 *  entityRoutes adapter binds `{ item }` so `$item` resolves in `render`). */
	variables?: Record<string, unknown>;
	/** Attribution for diagnostics / collision messages. */
	source?: { plugin?: string; ruleIndex?: number };
}
