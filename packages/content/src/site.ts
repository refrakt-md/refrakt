import { resolve, relative, sep as pathSep, posix as pathPosix } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes, Schema } from '@markdoc/markdoc';
import {
	tags,
	nodes,
	extractHeadings,
	firstH1,
	extractSeo,
	createCorePipelineHooks,
	escapeFenceTags,
	resolveCoreSentinels,
	captureDeferredBodies,
	functions,
} from '@refrakt-md/runes';
import type { CompiledXrefPattern } from '@refrakt-md/runes';
import type { PageSeo, HeadingInfo } from '@refrakt-md/runes';
import type {
	Plugin,
	PipelineWarning,
	AggregatedData,
	SecurityPolicy,
	ContributedPage,
	ProjectFiles,
} from '@refrakt-md/types';
import { resolveSecurityPolicy } from '@refrakt-md/types';
import { fsProjectFiles } from '@refrakt-md/types/project-files';
import type { PipelineStats } from './pipeline.js';
import type { PipelineReporter } from './format.js';
import { ContentTree, type PartialFile } from './content-tree.js';
import { parseFrontmatter, Frontmatter } from './frontmatter.js';
import { Router, Route } from './router.js';
import { resolveLayouts, ResolvedLayout } from './layout.js';
import { resolveTintCascade, type ResolvedTintCascade } from './tint-cascade.js';
import { NavTree } from './navigation.js';
import { runPipeline, type HookSet } from './pipeline.js';
import { createEntityRoutesHooks } from './entity-routes.js';
import { createPageEntityHooks } from './page-entities.js';
import { getGitTimestamps, resolveTimestamps, type FileTimestamps } from './timestamps.js';
import { readFileRoots, type FileRoots } from './file-roots.js';
import { validatePage, type ValidatePageOptions, type ValidationSettings } from './validate.js';

/** Async reader for ad-hoc lookups in virtual (non-FS) hosting environments.
 *  Returns the file content or `null` when the path is unknown. */
export type VirtualReader = (path: string) => Promise<string | null>;

export interface Site {
	/** The content tree */
	tree: ContentTree;
	/** All resolved pages with routes and layouts */
	pages: SitePage[];
	/** Navigation trees found in layouts */
	navigation: NavTree[];
	/** Diagnostics from the cross-page pipeline (empty when no pipeline hooks ran) */
	pipelineWarnings: PipelineWarning[];
	/** Build-phase statistics from the pipeline run */
	pipelineStats: PipelineStats;
	/** Cross-page data produced by all aggregate hooks, keyed by package name */
	aggregated: AggregatedData;
	/** Partial files from _partials/ directory, keyed by relative name */
	partials: Map<string, PartialFile>;
}

export interface SitePage {
	route: Route;
	frontmatter: Frontmatter;
	content: string;
	renderable: RenderableTreeNodes;
	headings: HeadingInfo[];
	layout: ResolvedLayout;
	seo: PageSeo;
	/** Per-page tint cascade resolved from the layout chain + page frontmatter
	 *  (SPEC-052). Adapters emit this as `data-theme` / `data-tint` /
	 *  `data-tint-lock` attributes on `<html>` at SSR time. */
	tintCascade: ResolvedTintCascade;
	/** Provenance — file-backed by default, or contributed by a plugin (SPEC-069). */
	source?: { type: 'file' | 'contributed'; plugin?: string; ruleIndex?: number };
}

/** The subset of {@link ProcessContentTreeOptions} the shared page-environment
 *  helpers read, so `validateContent` can satisfy it without pretending to be
 *  a full content load. */
export interface PageEnvironmentOptions {
	fileRoots?: FileRoots;
	sandbox?: ProjectFiles;
	projectRoot?: string;
	additionalTags?: Record<string, Schema>;
	plugins?: Plugin[];
	xrefPatterns?: CompiledXrefPattern[];
	repoUrl?: string;
	repoBranch?: string;
}

/**
 * Pre-parse partials into Markdoc ASTs for the transform config. Two sources
 * contribute:
 * - Site-local `_partials/` (already scanned by `ContentTree`; keys are
 *   unprefixed relative paths like `footer.md`).
 * - Registered file roots (project-wide; keys are namespaced like
 *   `shared:footer.md`). Plugins contribute roots via `Plugin.fileRoots`; both
 *   arrive in `opts.fileRoots` already merged by the loader bootstrap.
 *
 * Shared with `validateContent` (SPEC-135 D14): a validation run that skipped
 * partials would not see `{% partial %}` / `{% include %}` content, and would
 * report a different finding set from the build for the same corpus.
 */
export async function parsePagePartials(
	tree: ContentTree,
	opts: PageEnvironmentOptions,
): Promise<Record<string, Node> | undefined> {
	const partialFiles = tree.partials();
	const namespacedPartials =
		opts.fileRoots && Object.keys(opts.fileRoots).length > 0
			? await readFileRoots(opts.fileRoots, {
					projectFiles: opts.sandbox,
					projectRoot: opts.projectRoot,
				})
			: new Map<string, PartialFile>();
	if (partialFiles.size === 0 && namespacedPartials.size === 0) return undefined;
	const parsed: Record<string, Node> = {};
	for (const [name, partial] of partialFiles) {
		parsed[name] = Markdoc.parse(escapeFenceTags(partial.raw));
	}
	for (const [name, partial] of namespacedPartials) {
		parsed[name] = Markdoc.parse(escapeFenceTags(partial.raw));
	}
	return parsed;
}

/**
 * Build the hook sets whose `preprocess` phase rewrites a page's AST before it
 * is validated and transformed — the core set (carrying snippet's SPEC-062
 * implementation) plus every plugin that registers hooks.
 *
 * The merged tags + nodes are threaded to the core hooks as `embedConfig`:
 * expand (SPEC-066) and collection (SPEC-070) need them to re-transform
 * extracted entity subtrees with the same schemas the host page used. Always
 * threaded, even when a site sets no xref patterns or project root.
 *
 * Shared with `validateContent` (SPEC-135 D14). Preprocess is not optional for
 * agreement: `{% snippet %}` resolves itself into a fence node here and
 * `{% include %}` pastes partial content in, so a validation run that skipped
 * it would validate a different tree than the build does.
 *
 * `processContentTree` appends two more hook sets (`__entity-routes__`,
 * `__page-entities__`) after these. Neither defines `preprocess`, so their
 * absence here cannot change a finding — they only matter to the
 * register/aggregate phases, which are the `--deep` tier's business.
 */
export function buildPreprocessHookSets(
	opts: PageEnvironmentOptions,
	parsedPartials: Record<string, Node> | undefined,
): HookSet[] {
	const embedTags = opts.additionalTags ? { ...tags, ...opts.additionalTags } : tags;
	// SPEC-072 — plugin-declared (type, field) ordering overrides so
	// collection/relationships sort & group in domain order. Defaults still come
	// from each rune's attribute `matches`; these only cover divergent cases.
	const orderings: Record<string, Record<string, string[]>> = {};
	for (const pkg of opts.plugins ?? []) {
		const o = pkg.theme?.orderings;
		if (!o) continue;
		for (const [type, fields] of Object.entries(o)) {
			orderings[type] = { ...(orderings[type] ?? {}), ...fields };
		}
	}
	// SPEC-076 / WORK-357 — `(type, field, value) → sentiment` derived from each
	// rune's `metaFields.*.sentimentMap`, keyed by the rune's `block`.
	const sentiments: Record<string, Record<string, Record<string, string>>> = {};
	for (const pkg of opts.plugins ?? []) {
		for (const cfg of Object.values(pkg.theme?.runes ?? {})) {
			const type = (cfg as { block?: string }).block;
			const metaFields = (
				cfg as { metaFields?: Record<string, { sentimentMap?: Record<string, string> }> }
			).metaFields;
			if (!type || !metaFields) continue;
			for (const [field, fieldCfg] of Object.entries(metaFields)) {
				if (!fieldCfg?.sentimentMap) continue;
				sentiments[type] = sentiments[type] ?? {};
				sentiments[type][field] = { ...(sentiments[type][field] ?? {}), ...fieldCfg.sentimentMap };
			}
		}
	}
	const coreHooks = createCorePipelineHooks({
		xrefPatterns: opts.xrefPatterns,
		repoUrl: opts.repoUrl,
		repoBranch: opts.repoBranch,
		embedConfig: {
			tags: embedTags as Record<string, unknown>,
			nodes: nodes as Record<string, unknown>,
			functions: functions as Record<string, unknown>,
			orderings,
			sentiments,
			// Pass parsed partials so `{% partial file="…" /%}` inside a collection
			// body template (or an expand-resolved entity body) resolves the same
			// way it would inside a top-level page.
			partials: parsedPartials,
			projectRoot: opts.projectRoot,
			// SPEC-113 — expand / file-ref read source files through the same
			// provider as snippet (the sandbox provider on the options bag).
			projectFiles: opts.sandbox,
		},
	} as Parameters<typeof createCorePipelineHooks>[0]);
	const hookSets: HookSet[] = [{ pluginName: '__core__', hooks: coreHooks }];
	for (const pkg of opts.plugins ?? []) {
		if (pkg.pipeline) {
			hookSets.push({ pluginName: pkg.name, hooks: pkg.pipeline });
		}
	}
	return hookSets;
}

/** Inputs to {@link buildPageContentVariables}. */
export interface PageContentVariablesOptions {
	ast: Node;
	frontmatter: Frontmatter;
	relativePath: string;
	filePath: string;
	url: string;
	draft?: boolean;
	timestamps?: FileTimestamps;
	variables?: Record<string, unknown>;
	projectRoot?: string;
	sandbox?: ProjectFiles;
	sandboxExamplesDir?: string;
	securityPolicy?: unknown;
	siteConfig?: unknown;
}

/**
 * Build the `$page` / `$file` variable surface a page is processed against.
 *
 * Computed *before* preprocess so file-reading preprocessors (snippet) can
 * resolve `path=$file.path`-style attribute references against the same
 * variables a transform-time evaluator would.
 *
 * Shared with `validateContent` (SPEC-135 D14), and not optional for agreement:
 * a validation run that handed preprocess an empty variable surface leaves
 * every `{% snippet path=$file.path %}` unresolved, which then reports an
 * `attribute-undefined` finding for the error attribute snippet substitutes —
 * a finding the build does not have. Found exactly that way, against refrakt's
 * own site, before this was extracted.
 */
export function buildPageContentVariables(
	opts: PageContentVariablesOptions,
): Record<string, unknown> {
	const pagePath = posixPath(opts.relativePath);
	const filePath = opts.projectRoot
		? posixRelativeFromRoot(opts.projectRoot, opts.filePath)
		: pagePath;
	return {
		...opts.variables,
		frontmatter: opts.frontmatter,
		page: {
			url: opts.url,
			path: pagePath,
			dir: posixDirname(opts.relativePath),
			slug: lastUrlSegment(opts.url),
			title: derivePageTitle(opts.frontmatter, opts.ast),
			draft: opts.draft,
		},
		file: {
			path: filePath,
			created: opts.timestamps?.created,
			modified: opts.timestamps?.modified,
		},
		__sandboxFiles: opts.sandbox,
		__sandboxExamplesDir: opts.sandboxExamplesDir,
		__securityPolicy: opts.securityPolicy,
		// SPEC-104 §5 — the project's bg preset registry, so `bg="name"` can expand
		// a `sandbox`-typed preset into a backdrop guest at transform time (where
		// the sandbox readers live). Sandbox presets are project-level config.
		__backgrounds: (opts.siteConfig as { backgrounds?: Record<string, unknown> } | undefined)
			?.backgrounds,
	};
}

/** Inputs to {@link buildPageTransformConfig} — the per-page surface deciding
 *  which tags, nodes, functions and partials a page is read against. */
export interface PageTransformConfigOptions {
	ast: Node;
	content: string;
	path: string;
	sourcePath: string;
	icons?: Record<string, Record<string, string>>;
	additionalTags?: Record<string, Schema>;
	contentVariables?: Record<string, unknown>;
	partials?: Record<string, Node>;
}

/**
 * Build the Markdoc config one page is validated and transformed against.
 *
 * **Extracted so the two paths cannot build it differently** — SPEC-135 D14.
 * SPEC-132 deliberately validates against *the very object* handed to
 * `transform`, so the two cannot disagree about which tags and attributes
 * exist. A `validateContent` that assembled its own tag set would re-open
 * exactly that gap, and then nothing holds up D5a's guarantee that the CLI and
 * the build report the same findings. This function is that mechanism, not
 * tidying: both callers go through it, or the guarantee is only hoped for.
 *
 * Mutates `ast` — `captureDeferredBodies` rewrites deferBody runes' bodies to
 * source before transform (SPEC-070 / WORK-262). Kept inside this function
 * rather than beside it so a validation run sees the same AST shape the
 * transform would.
 */
export function buildPageTransformConfig(opts: PageTransformConfigOptions): {
	config: Record<string, unknown>;
	headings: HeadingInfo[];
} {
	const headings = extractHeadings(opts.ast);
	const mergedTags = opts.additionalTags ? { ...tags, ...opts.additionalTags } : tags;
	// Capture deferBody runes' bodies as source before transform, so their
	// per-entity `$item` templates aren't resolved here (SPEC-070 / WORK-262).
	captureDeferredBodies(opts.ast, (name) =>
		Boolean((mergedTags as Record<string, { deferBody?: boolean }>)[name]?.deferBody),
	);
	const config: Record<string, unknown> = {
		tags: mergedTags,
		nodes,
		functions,
		variables: {
			generatedIds: new Set<string>(),
			path: opts.path,
			headings,
			__source: opts.content,
			__sourcePath: opts.sourcePath,
			...(opts.icons ? { __icons: opts.icons } : {}),
			...opts.contentVariables,
		},
	};
	if (opts.partials) {
		config.partials = opts.partials;
	}
	return { config, headings };
}

function transformContent(
	ast: Node,
	content: string,
	path: string,
	sourcePath: string,
	icons?: Record<string, Record<string, string>>,
	additionalTags?: Record<string, Schema>,
	contentVariables?: Record<string, unknown>,
	partials?: Record<string, Node>,
	validation?: ValidatePageOptions,
): { renderable: RenderableTreeNodes; headings: HeadingInfo[]; findings: PipelineWarning[] } {
	const { config, headings } = buildPageTransformConfig({
		ast,
		content,
		path,
		sourcePath,
		icons,
		additionalTags,
		contentVariables,
		partials,
	});
	// SPEC-132 — validate against `config`, the very object handed to
	// `transform` below, so the two cannot disagree about which tags and
	// attributes exist. Plugin runes are already merged into `mergedTags`, so
	// they are covered with no extra wiring. Findings are returned, never
	// rendered: nothing about the tree the transform produces changes (D9).
	const findings = validation ? validatePage(ast, config, validation) : [];
	return { renderable: Markdoc.transform(ast, config as any), headings, findings };
}

/** Convert a host-OS file path to POSIX form (forward slashes). */
function posixPath(p: string): string {
	return pathSep === '/' ? p : p.split(pathSep).join('/');
}

/** POSIX dirname with the `"."` (no-directory) sentinel mapped to `""` so
 *  callers don't have to special-case content-root pages. */
function posixDirname(p: string): string {
	const dir = pathPosix.dirname(posixPath(p));
	return dir === '.' ? '' : dir;
}

/** Project-root-relative path in POSIX form. */
function posixRelativeFromRoot(projectRoot: string, absolutePath: string): string {
	return posixPath(relative(projectRoot, absolutePath));
}

/** Last URL segment, stripping any trailing slash. Empty string for `/`. */
function lastUrlSegment(url: string): string {
	const trimmed = url.replace(/\/+$/, '');
	const idx = trimmed.lastIndexOf('/');
	return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

/** Derive the page title: trimmed non-empty frontmatter.title wins, else
 *  the first H1 in the AST (depth-first, walking into tag children), else
 *  undefined. */
function derivePageTitle(frontmatter: Frontmatter, ast: Node): string | undefined {
	const raw = frontmatter.title;
	if (typeof raw === 'string') {
		const trimmed = raw.trim();
		if (trimmed.length > 0) return trimmed;
	}
	return firstH1(ast);
}

/** A `ProjectFiles` that denies every read — the default in tree/hosted mode
 *  when the caller hasn't supplied a provider (sandbox `src` resolves to the
 *  in-band "directory not found" message). */
const nullProjectFiles: ProjectFiles = {
	read: () => null,
	list: () => [],
	exists: () => false,
};

interface ProcessContentTreeOptions {
	basePath?: string;
	icons?: Record<string, Record<string, string>>;
	additionalTags?: Record<string, Schema>;
	plugins?: Plugin[];
	variables?: Record<string, unknown>;
	securityPolicy?: SecurityPolicy;
	gitTimestamps?: Map<string, FileTimestamps>;
	/** The project's files (SPEC-113). Sandbox example reads resolve through
	 *  this provider; containment is its contract. Defaults to a deny-all
	 *  provider when omitted. */
	sandbox?: ProjectFiles;
	/** Project-root-relative POSIX key of the sandbox examples directory.
	 *  Joined with a sandbox's `src` and resolved through {@link sandbox}. */
	sandboxExamplesDir?: string;
	/** Site-wide colour-scheme default seeding the per-page tint cascade. */
	colorScheme?: 'auto' | 'light' | 'dark';
	/** Absolute path to the project root (the directory containing
	 *  `refrakt.config.json`). Used to compute `$file.path` as a
	 *  project-root-relative POSIX path. When omitted, `$file.path` falls
	 *  back to the page's content-root-relative path (`$page.path`). */
	projectRoot?: string;
	/** Per-site config slice, passed to contributePages hooks (SPEC-069). The
	 *  built-in entityRoutes adapter reads `entityRoutes` from it. */
	siteConfig?: unknown;
	/** Compiled xref patterns from `refrakt.config.json#/xrefs`. Used by
	 *  the xref resolver as a URL-resolution fallback when registry entities
	 *  have no usable `sourceUrl`. */
	xrefPatterns?: CompiledXrefPattern[];
	/** Canonical repo URL (`SiteConfig.repoUrl`) threaded through to the
	 *  file-ref resolver (SPEC-078) for canonical `View source on GitHub`
	 *  URL construction. */
	repoUrl?: string;
	/** Git ref appended to GitHub source URLs (`SiteConfig.repoBranch`).
	 *  Defaults to `"main"` when omitted. */
	repoBranch?: string;
	/** Registered file roots — namespace → absolute directory path. Each
	 *  root is scanned at content-load time and its `.md` files become
	 *  available as Markdoc partials under `namespace:filename` keys. */
	fileRoots?: FileRoots;
	/** Sink for this load's pipeline diagnostics (SPEC-135 D5). Called once,
	 *  after every phase has run, with the same stats and warnings the
	 *  returned `Site` carries. Omitted means silent — see
	 *  {@link LoadContentFromTreeOptions.reporter} for why the default sits at
	 *  the loader boundary rather than here. */
	reporter?: PipelineReporter;
}

async function processContentTree(
	tree: ContentTree,
	opts: ProcessContentTreeOptions,
): Promise<Site> {
	const resolvedSecurity = resolveSecurityPolicy(opts.securityPolicy);
	const router = new Router(opts.basePath ?? '/');
	const pages: SitePage[] = [];
	const sandbox = opts.sandbox ?? nullProjectFiles;
	const gitTimestamps = opts.gitTimestamps ?? new Map<string, FileTimestamps>();

	// Pre-parse partials into Markdoc ASTs for the transform config. Two
	// sources contribute:
	// - Site-local `_partials/` directory (already-scanned by ContentTree;
	//   keys are unprefixed relative paths like `footer.md`).
	// - Registered file roots (project-wide; keys are namespaced like
	//   `shared:footer.md`). Plugins can also contribute roots via
	//   `Plugin.fileRoots`; both arrive in `opts.fileRoots` already
	//   merged by the loader bootstrap.
	const partialFiles = tree.partials();
	const parsedPartials = await parsePagePartials(tree, opts);

	// Build hook sets here (rather than after the per-page loop, as before)
	// so the preprocess phase can run during page processing — each hook set
	// gets a chance to rewrite the parsed AST before the transform runs.
	// The core hook set carries snippet's preprocess implementation (SPEC-062);
	// plugins that register their own preprocess hooks plug in alongside.
	//
	// The merged tags + nodes (core + every loaded plugin) are also threaded
	// through to the core hooks as `embedConfig` — expand (SPEC-066) needs
	// them to re-transform extracted entity subtrees using the same schemas
	// the host page used.
	const hookSets: HookSet[] = buildPreprocessHookSets(opts, parsedPartials);
	// Built-in entityRoutes config-rules adapter (SPEC-069). Resolves render-template
	// partials from the (lazily populated) partials map. No-op unless the site
	// config declares `entityRoutes`.
	hookSets.push({
		pluginName: '__entity-routes__',
		hooks: createEntityRoutesHooks((name) => {
			const node = parsedPartials?.[name];
			return node ? Markdoc.format(node) : undefined;
		}),
	});

	// SPEC-092 — register pages that declare a `type` (frontmatter) or match a
	// `routeRules` `entity` rule as typed registry entities, in addition to their
	// `page` registration. Runs after `__core__` so it can reuse the page entity's
	// reserved-filtered data. No-op unless such a page/rule exists.
	hookSets.push({
		pluginName: '__page-entities__',
		hooks: createPageEntityHooks(opts.siteConfig),
	});

	// Per-page preprocess context — file-system + project-root shared with the
	// transform-time sandbox but exposed at preprocess time (variables aren't
	// available yet). Warnings accumulate into a per-page array that callers
	// funnel through the standard pipeline-warnings surface.
	const preprocessWarnings: {
		severity: 'info' | 'warning' | 'error';
		message: string;
		url?: string;
	}[] = [];

	// SPEC-132 — per-page `Markdoc.validate()` findings, collected as pages are
	// transformed and merged into the pipeline warnings below. Settings come
	// from the site's config; absent config means the documented defaults.
	const validationFindings: PipelineWarning[] = [];
	const validationSettings = (opts.siteConfig as { validation?: ValidationSettings } | undefined)
		?.validation;
	const makePreprocessCtx = (pageUrl: string, variables?: Record<string, unknown>) => ({
		info(message: string, url?: string) {
			preprocessWarnings.push({ severity: 'info', message, url: url ?? pageUrl });
		},
		warn(message: string, url?: string) {
			preprocessWarnings.push({ severity: 'warning', message, url: url ?? pageUrl });
		},
		error(message: string, url?: string) {
			preprocessWarnings.push({ severity: 'error', message, url: url ?? pageUrl });
		},
		projectRoot: opts.projectRoot,
		sandbox: opts.sandbox,
		variables,
		// SPEC-129 — the *same* map `transformContent` hands Markdoc as
		// `config.partials`, so `{% include %}` and `{% partial %}` read one
		// directory and one set of file roots. Include clones before it pastes;
		// these nodes are shared by every page that references them.
		//
		// Defaulted to `{}` rather than left undefined: a site with no partials at
		// all is a legitimate state, and an `{% include %}` there should get the
		// author-facing "not found, here is what is available" error. Undefined
		// means *no map was wired* — a custom pipeline — and include no-ops so the
		// schema transform can name the wiring, matching snippet and data without a
		// sandbox.
		partials: parsedPartials ?? {},
	});

	for (const page of tree.pages()) {
		const { frontmatter, content } = parseFrontmatter(page.raw);
		const route = router.resolve(page.relativePath, frontmatter);
		const layout = resolveLayouts(page, tree.root, opts.icons);
		const fileTimestamps = resolveTimestamps(
			page.relativePath,
			page.filePath,
			gitTimestamps,
			frontmatter,
		);
		let ast = Markdoc.parse(escapeFenceTags(content));

		// Compute the page-variable surface before preprocess so file-reading
		// preprocessors (snippet) can resolve `path=$file.path` style attribute
		// references against the same variables a transform-time evaluator would.
		const contentVariables = buildPageContentVariables({
			ast,
			frontmatter,
			relativePath: page.relativePath,
			filePath: page.filePath,
			url: route.url,
			draft: route.draft,
			timestamps: fileTimestamps,
			variables: opts.variables,
			projectRoot: opts.projectRoot,
			sandbox,
			sandboxExamplesDir: opts.sandboxExamplesDir,
			securityPolicy: resolvedSecurity,
			siteConfig: opts.siteConfig,
		});

		// SPEC-062 preprocess phase — runs after variables are computed (so
		// hooks can resolve `path=$file.path`-style attribute references against
		// them) and before the schema-driven transform. Snippet pre-resolves
		// itself into a fence node here; the returned AST (or the mutated one
		// if void) feeds the transform.
		const pageMeta = {
			url: route.url,
			relativePath: page.relativePath,
			filePath: page.filePath,
		};
		const ppCtx = makePreprocessCtx(route.url, contentVariables);
		for (const { hooks } of hookSets) {
			if (!hooks.preprocess) continue;
			const next = await hooks.preprocess(ast, pageMeta, ppCtx);
			if (next) ast = next;
		}

		const { renderable, headings, findings } = transformContent(
			ast,
			content,
			route.url,
			page.relativePath,
			opts.icons,
			opts.additionalTags,
			contentVariables,
			parsedPartials,
			{ url: route.url, settings: validationSettings },
		);
		validationFindings.push(...findings);
		const seo = extractSeo(renderable, frontmatter, route.url);

		const tintCascade = resolveTintCascade(page, tree.root, {
			colorScheme: opts.colorScheme,
		});

		pages.push({ route, frontmatter, content, renderable, headings, layout, seo, tintCascade });
	}

	// Mark file-backed pages with their provenance (SPEC-069).
	for (const p of pages) p.source = { type: 'file' };

	// Render a plugin-contributed page (SPEC-069) into a full SitePage, applying
	// basePath, resolving the layout/tint cascade for its URL, and running the
	// same transform (incl. deferBody capture) as a file page.
	const base = (opts.basePath ?? '/').replace(/\/$/, '');
	const renderContributed = (cp: ContributedPage): SitePage => {
		const frontmatter = { ...(cp.frontmatter ?? {}) } as Frontmatter;
		if (cp.title != null && frontmatter.title === undefined) frontmatter.title = cp.title;
		const url = cp.url.startsWith('/') ? `${base}${cp.url}` : `${base}/${cp.url}`;
		const relativePath = cp.url.replace(/^\//, '');
		// `raw` is read by resolveTintCascade (re-parses frontmatter). Contributed
		// pages carry parsed frontmatter already; an empty raw means their tint
		// comes from the layout cascade (no per-page tint frontmatter).
		const layoutPage = { relativePath, raw: '' } as never;
		const layout = resolveLayouts(layoutPage, tree.root, opts.icons);
		const ast = Markdoc.parse(escapeFenceTags(cp.content));
		const contentVariables: Record<string, unknown> = {
			...opts.variables,
			frontmatter,
			page: {
				url,
				path: relativePath,
				dir: posixDirname(relativePath),
				slug: lastUrlSegment(url),
				title: cp.title ?? derivePageTitle(frontmatter, ast),
				draft: frontmatter.draft === true,
			},
			file: { path: relativePath, created: undefined, modified: undefined },
			__sandboxFiles: sandbox,
			__sandboxExamplesDir: opts.sandboxExamplesDir,
			__securityPolicy: resolvedSecurity,
			// Per-contribution bound variables (e.g. entityRoutes binds `item`).
			...(cp.variables ?? {}),
		};
		const { renderable, headings, findings } = transformContent(
			ast,
			cp.content,
			url,
			relativePath,
			opts.icons,
			opts.additionalTags,
			contentVariables,
			parsedPartials,
			// SPEC-132's open question: a finding on a synthesized page is a
			// *plugin* bug, reported against a page whose source the author
			// cannot open. Attribute it and say so, rather than exempting it.
			{ url, settings: validationSettings, contributedBy: cp.source?.plugin ?? 'contributed' },
		);
		validationFindings.push(...findings);
		const seo = extractSeo(renderable, frontmatter, url);
		const tintCascade = resolveTintCascade(layoutPage, tree.root, {
			colorScheme: opts.colorScheme,
		});
		return {
			route: {
				url,
				filePath: `<contributed:${cp.source?.plugin ?? 'plugin'}>`,
				draft: frontmatter.draft === true,
			},
			frontmatter,
			content: cp.content,
			renderable,
			headings,
			layout,
			seo,
			tintCascade,
			source: { type: 'contributed', plugin: cp.source?.plugin, ruleIndex: cp.source?.ruleIndex },
		};
	};

	// `hookSets` were built before the per-page loop so the preprocess phase
	// could run during page processing. They're reused here for register /
	// contribute / aggregate / postProcess.
	const {
		pages: enrichedPages,
		warnings,
		stats,
		aggregated,
	} = await runPipeline(pages, hookSets, {
		renderContributed,
		projectRoot: opts.projectRoot,
		siteConfig: opts.siteConfig,
	});

	// Funnel any preprocess-phase diagnostics (file-not-found, sandbox rejections,
	// line-range clamps) into the same warnings array the rest of the pipeline
	// uses. Preprocess runs before `runPipeline`, so its warnings would otherwise
	// be invisible to adapters that only print the pipeline summary.
	for (const w of preprocessWarnings) {
		warnings.push({
			severity: w.severity,
			phase: 'register',
			pluginName: '__preprocess__',
			url: w.url,
			message: w.message,
		});
	}

	// SPEC-132 — content-validation findings. Collected during Phase 1 (file
	// pages) and during `runPipeline`'s contribute phase (synthesized pages),
	// so both are complete by the time this runs.
	warnings.push(...validationFindings);

	// SPEC-130 / WORK-563 — re-harvest `seo` now the cross-page pipeline is done.
	//
	// The per-page harvests above run in Phase 1, before `register` / `aggregate`
	// / `postProcess` have touched anything. Every sentinel resolved in Phase 4
	// was therefore invisible to them: `{% breadcrumb auto=true %}` has
	// `buildAutoBreadcrumb` construct its renderables in a `postProcess` hook, so
	// the page rendered a correct `BreadcrumbList` and published *nothing*. The
	// same blind spot covers collection, pagination, aggregate and drawer, should
	// any of them ever carry schema.
	//
	// Recomputing over `enrichedPages` covers both original harvest points at
	// once — file pages and the contributed pages `renderContributed` builds
	// during the pipeline — so the fix cannot land half-applied.
	//
	// **After the pipeline, deliberately not after the engine.** There is no
	// post-engine seam to move to: in SvelteKit the identity transform runs in
	// the site's own load function (`site/src/routes/[...slug]/+page.server.ts`),
	// and Eleventy never calls `createTransform` at all. A post-engine harvest
	// would be N relocations, several of them in user-land site code. This is the
	// last framework-agnostic point, which is why the harvest lives here.
	//
	// `extractSeo` recomputes `og` alongside `jsonLd` by construction — which is
	// wanted, not incidental: `postProcess` can inject content that changes the
	// first `h1`, paragraph or image `extractOgMeta` reads.
	for (const page of enrichedPages) {
		page.seo = extractSeo(page.renderable, page.frontmatter, page.route.url);
	}

	// Apply auto-resolutions to layout regions per page. Layouts are parsed once
	// and shared across pages, but the auto-open / auto-pagination sentinels need
	// per-page context (current URL, sibling order). The pipeline already wired
	// core hooks against each page's renderable; here we apply the same resolvers
	// to every region's content with the same aggregated data.
	const coreData = aggregated['__core__'] as Parameters<typeof resolveCoreSentinels>[2] | undefined;
	if (coreData) {
		for (const page of enrichedPages) {
			if (page.layout.regions.size === 0) continue;
			const ctx = makeContextForRegions(warnings, page.route.url);
			// Build the global search scope: page.renderable + every region's content.
			// This gives auto-pagination visibility into navs that live in other
			// regions (e.g. the sidebar nav in the `nav` region) so prev/next can
			// follow the declared reading order.
			const navSearchScope: unknown[] = [page.renderable];
			for (const region of page.layout.regions.values()) {
				navSearchScope.push(region.content);
			}
			const resolvedRegions = new Map<string, ReturnType<typeof Map.prototype.get>>();
			let mutated = false;
			for (const [name, region] of page.layout.regions) {
				const resolved = resolveCoreSentinels(
					region.content,
					page.route.url,
					coreData,
					ctx,
					navSearchScope,
				) as typeof region.content;
				if (resolved !== region.content) {
					mutated = true;
					resolvedRegions.set(name, { ...region, content: resolved });
				} else {
					resolvedRegions.set(name, region);
				}
			}
			if (mutated) {
				(page.layout as { regions: typeof page.layout.regions }).regions =
					resolvedRegions as typeof page.layout.regions;
			}
		}
	}

	// SPEC-135 D5 — one report per load, at the function every mode goes
	// through. Fires after all four phases so `warnings` is complete; the
	// caller's cache decides how often a load actually happens, which is what
	// keeps a dev session from re-printing on every navigation.
	opts.reporter?.(stats, warnings);

	return {
		tree,
		pages: enrichedPages,
		navigation: [], // TODO: Extract from resolved layouts
		pipelineWarnings: warnings,
		pipelineStats: stats,
		aggregated,
		partials: partialFiles,
	};
}

function makeContextForRegions(warnings: PipelineWarning[], url: string) {
	return {
		info(message: string, infoUrl?: string) {
			warnings.push({
				severity: 'info',
				phase: 'postProcess',
				pluginName: '__core__/regions',
				url: infoUrl ?? url,
				message,
			});
		},
		warn(message: string, warnUrl?: string) {
			warnings.push({
				severity: 'warning',
				phase: 'postProcess',
				pluginName: '__core__/regions',
				url: warnUrl ?? url,
				message,
			});
		},
		error(message: string, errUrl?: string) {
			warnings.push({
				severity: 'error',
				phase: 'postProcess',
				pluginName: '__core__/regions',
				url: errUrl ?? url,
				message,
			});
		},
	};
}

/**
 * Load a content directory and resolve all pages, routes, layouts, and navigation.
 *
 * When `packages` are provided, the cross-page pipeline runs after loading:
 * core hooks + package hooks register entities, aggregate cross-page data,
 * and post-process pages before returning.
 *
 * When `sandboxExamplesDir` is provided, sandbox runes with `src` attributes
 * can load code from external files in that directory.
 *
 * `securityPolicy` controls how runes treat untrusted author content. Defaults
 * to `'trusted'` (current behaviour). Set `'strict'` for hosted-product use
 * to strip scripts and harden the sandbox iframe.
 */
export async function loadContent(dirPath: string, options: LoadContentOptions): Promise<Site>;
export async function loadContent(
	dirPath: string,
	basePath?: string,
	icons?: Record<string, Record<string, string>>,
	additionalTags?: Record<string, Schema>,
	packages?: Plugin[],
	sandboxExamplesDir?: string,
	variables?: Record<string, unknown>,
	securityPolicy?: SecurityPolicy,
	projectRoot?: string,
	xrefPatterns?: CompiledXrefPattern[],
	fileRoots?: FileRoots,
	siteConfig?: unknown,
	repoUrl?: string,
	repoBranch?: string,
): Promise<Site>;
export async function loadContent(
	dirPath: string,
	basePathOrOptions: string | LoadContentOptions = '/',
	icons?: Record<string, Record<string, string>>,
	additionalTags?: Record<string, Schema>,
	packages?: Plugin[],
	sandboxExamplesDir?: string,
	variables?: Record<string, unknown>,
	securityPolicy?: SecurityPolicy,
	projectRoot?: string,
	xrefPatterns?: CompiledXrefPattern[],
	fileRoots?: FileRoots,
	siteConfig?: unknown,
	repoUrl?: string,
	repoBranch?: string,
): Promise<Site> {
	// SPEC-135 D5 — the options-bag form. The positional signature had already
	// reached fourteen parameters, so `reporter` arrives as a field rather than
	// a fifteenth argument. Both forms are supported and both stay exported;
	// whether 1.0 keeps the positional one is WORK-576.
	//
	// `reporter` is reachable only from the bag: the positional form predates
	// it and gains no fifteenth slot, so a positional caller is silent — which
	// is exactly today's behaviour for every one of them.
	let reporter: PipelineReporter | undefined;
	let basePath: string;
	if (typeof basePathOrOptions === 'object') {
		const o = basePathOrOptions;
		basePath = o.basePath ?? '/';
		icons = o.icons;
		additionalTags = o.additionalTags;
		packages = o.plugins;
		sandboxExamplesDir = o.sandboxExamplesDir;
		variables = o.variables;
		securityPolicy = o.securityPolicy;
		projectRoot = o.projectRoot;
		xrefPatterns = o.xrefPatterns;
		fileRoots = o.fileRoots;
		siteConfig = o.siteConfig;
		repoUrl = o.repoUrl;
		repoBranch = o.repoBranch;
		reporter = o.reporter;
	} else {
		basePath = basePathOrOptions;
	}

	const tree = await ContentTree.fromDirectory(dirPath);
	const resolvedExamplesDir = sandboxExamplesDir
		? resolve(sandboxExamplesDir)
		: resolve(dirPath, '..', 'examples');
	// Default to the content directory's parent (the common
	// `<project>/site/content/` → `<project>/site/` layout). Adapters that
	// know the real project root (the directory containing
	// `refrakt.config.json`) should pass it explicitly.
	const resolvedProjectRoot = projectRoot ?? resolve(dirPath, '..');
	// SPEC-113 — one `ProjectFiles` rooted at the project, with containment as a
	// contract. The sandbox examples directory becomes a project-relative key so
	// the `examplesDir + '/' + src` join inherits that containment.
	const projectFiles = fsProjectFiles(resolvedProjectRoot);
	const examplesKey = posixRelativeFromRoot(resolvedProjectRoot, resolvedExamplesDir);

	return processContentTree(tree, {
		basePath,
		icons,
		additionalTags,
		plugins: packages,
		variables,
		securityPolicy,
		gitTimestamps: getGitTimestamps(dirPath),
		sandbox: projectFiles,
		sandboxExamplesDir: examplesKey,
		projectRoot: resolvedProjectRoot,
		xrefPatterns,
		fileRoots,
		siteConfig,
		repoUrl,
		repoBranch,
		reporter,
	});
}

/**
 * Options accepted by {@link loadContent}'s options-bag overload.
 *
 * The same fields the positional form takes, plus `reporter` (SPEC-135 D5),
 * which has no positional equivalent. `plugins` is spelled as it is on
 * {@link LoadContentFromTreeOptions} rather than the positional form's
 * `packages`, so the two bags read the same.
 */
export interface LoadContentOptions {
	/** URL base path for the Router. Default: `'/'`. */
	basePath?: string;
	/** Icon registry to inject into the Markdoc transform context. */
	icons?: Record<string, Record<string, string>>;
	/** Markdoc tag schemas to merge on top of the core runes. */
	additionalTags?: Record<string, Schema>;
	/** Plugins whose pipeline hooks should run in addition to core hooks. */
	plugins?: Plugin[];
	/** Directory holding sandbox example sources. Defaults to `<dirPath>/../examples`. */
	sandboxExamplesDir?: string;
	/** Site-wide Markdoc variables available in content via `{% $name %}`. */
	variables?: Record<string, unknown>;
	/** Security policy for sandbox runes. Default: `'trusted'`. */
	securityPolicy?: SecurityPolicy;
	/** Absolute path to the project root (where `refrakt.config.json` lives). */
	projectRoot?: string;
	/** Compiled xref patterns from `refrakt.config.json#/xrefs`. */
	xrefPatterns?: CompiledXrefPattern[];
	/** Registered file roots — namespace → absolute directory path. */
	fileRoots?: FileRoots;
	/** Per-site config slice — also where `validation` settings are read from. */
	siteConfig?: unknown;
	/** Canonical repo URL (`SiteConfig.repoUrl`) for GitHub source URLs. */
	repoUrl?: string;
	/** Git ref appended to GitHub source URLs. Defaults to `"main"`. */
	repoBranch?: string;
	/** Sink for this load's pipeline diagnostics. See
	 *  {@link LoadContentFromTreeOptions.reporter} — omitted means silent. */
	reporter?: PipelineReporter;
}

/** Options accepted by {@link loadContentFromTree}. */
export interface LoadContentFromTreeOptions {
	/** URL base path for the Router. Default: `'/'`. */
	basePath?: string;
	/** Icon registry to inject into the Markdoc transform context. */
	icons?: Record<string, Record<string, string>>;
	/** Markdoc tag schemas to merge on top of the core runes. */
	additionalTags?: Record<string, Schema>;
	/** Plugins whose pipeline hooks should run in addition to core hooks. */
	plugins?: Plugin[];
	/** Site-wide Markdoc variables available in content via `{% $name %}`. */
	variables?: Record<string, unknown>;
	/** Security policy for sandbox runes. Default: `'trusted'`. */
	securityPolicy?: SecurityPolicy;
	/** Site-wide `theme.colorScheme` default — seeds the per-page tint cascade.
	 *  Defaults to `'auto'`. Adapters typically read this from
	 *  `refrakt.config.json` site.theme.colorScheme. See SPEC-052. */
	colorScheme?: 'auto' | 'light' | 'dark';
	/** Optional reader for ad-hoc lookups in virtual environments.
	 *
	 *  Reserved for future asynchronous resolution paths (e.g., on-demand sandbox
	 *  source resolution). Not currently consumed by any built-in code path — the
	 *  page corpus, partials, and layouts all come from `tree`. Accepted here so
	 *  hosts can wire it once and not need to thread it again when new internal
	 *  consumers land. */
	reader?: VirtualReader;
	/** Absolute path to the project root (where `refrakt.config.json` lives).
	 *  Used to compute `$file.path` as a project-root-relative POSIX path.
	 *  When omitted, `$file.path` falls back to the page's content-root-relative
	 *  path. Hosted environments that have a meaningful project-root concept
	 *  should pass it; pure in-memory hosts that don't can leave it undefined. */
	projectRoot?: string;
	/** Compiled xref patterns from `refrakt.config.json#/xrefs`. Hosted
	 *  environments that own their config resolution can compile patterns via
	 *  `compileXrefPatterns` and pass them here. */
	xrefPatterns?: CompiledXrefPattern[];
	/** Canonical repo URL (`SiteConfig.repoUrl`) threaded to the file-ref
	 *  resolver (SPEC-078) for GitHub source URL construction. */
	repoUrl?: string;
	/** Git ref appended to GitHub source URLs (`SiteConfig.repoBranch`).
	 *  Defaults to `"main"` when omitted. */
	repoBranch?: string;
	/** Registered file roots — namespace → absolute directory path. */
	fileRoots?: FileRoots;
	/** Per-site config slice — passed to contributePages hooks so the built-in
	 *  entityRoutes adapter can read `entityRoutes` and other site-scoped
	 *  config. */
	siteConfig?: unknown;
	/** The project's files (SPEC-113) — the provider every ad-hoc read (snippet,
	 *  sandbox `src`, fileRoots, plan scan) resolves through. A hosted host
	 *  materializes its repo into a `memoryProjectFiles(map)` and passes it here
	 *  for a fully fs-free build. Defaults to a deny-all provider. */
	projectFiles?: ProjectFiles;
	/** Per-page git timestamps (`relativePath → { created, modified }`). A remote
	 *  host supplies these from its source's history API; omitted means
	 *  frontmatter-only timestamps. */
	gitTimestamps?: Map<string, FileTimestamps>;
	/** Project-root-relative POSIX key of the sandbox examples directory, joined
	 *  with a sandbox's `src` and resolved through `projectFiles`. */
	sandboxExamplesDir?: string;
	/** Sink for this load's pipeline diagnostics (SPEC-135 D5). Called once per
	 *  load, after every phase, with the same stats and warnings the returned
	 *  `Site` carries — so no adapter has to format or write its own summary,
	 *  and none of them can drift apart.
	 *
	 *  **Omitted means silent, and the stderr default lives one layer up** —
	 *  on `createSiteLoader` / `createVirtualSiteLoader` / `createRefraktLoader`
	 *  (and passed explicitly by the two adapters that call `loadContent`
	 *  directly). SPEC-135 D5 originally put the default here; see D5b for why
	 *  it moved. In short: this function is a library entry point that hundreds
	 *  of tests and any embedding consumer call directly, and printing a build
	 *  summary from it would be a behaviour change for all of them. The loaders
	 *  are the boundary where "a site is being built for somebody to look at"
	 *  is actually true. */
	reporter?: PipelineReporter;
}

/**
 * Like {@link loadContent}, but driven by a pre-built {@link ContentTree}
 * instead of a filesystem directory. The full transform + cross-page pipeline
 * still runs.
 *
 * Use this from hosted environments where content originates somewhere other
 * than the local filesystem (e.g., a GitHub fetch, a database, an in-memory
 * authoring sandbox). The caller is responsible for assembling the tree.
 *
 * Differences from `loadContent`:
 * - No directory read — accepts the tree directly.
 * - No git history unless `gitTimestamps` is supplied — otherwise timestamps
 *   come from frontmatter only.
 * - Sandbox / snippet / fileRoots reads go through `projectFiles` (SPEC-113);
 *   without it they resolve to null/empty, so a host that wants file-backed
 *   runes passes a `memoryProjectFiles(map)` for a fully fs-free build.
 */
export async function loadContentFromTree(
	tree: ContentTree,
	options: LoadContentFromTreeOptions = {},
): Promise<Site> {
	// `reader` is accepted on the options bag for forward compatibility but not
	// currently plumbed — sandbox runes call file ops synchronously, so an async
	// reader can't back them today.
	return processContentTree(tree, {
		basePath: options.basePath,
		icons: options.icons,
		additionalTags: options.additionalTags,
		plugins: options.plugins,
		variables: options.variables,
		securityPolicy: options.securityPolicy,
		colorScheme: options.colorScheme,
		projectRoot: options.projectRoot,
		xrefPatterns: options.xrefPatterns,
		repoUrl: options.repoUrl,
		repoBranch: options.repoBranch,
		fileRoots: options.fileRoots,
		siteConfig: options.siteConfig,
		sandbox: options.projectFiles,
		sandboxExamplesDir: options.sandboxExamplesDir,
		gitTimestamps: options.gitTimestamps,
		reporter: options.reporter,
	});
}
