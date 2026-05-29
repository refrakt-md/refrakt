import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, sep as pathSep, posix as pathPosix } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes, Schema } from '@markdoc/markdoc';
import { tags, nodes, extractHeadings, firstH1, extractSeo, createCorePipelineHooks, escapeFenceTags, resolveCoreSentinels, captureDeferredBodies, functions } from '@refrakt-md/runes';
import type { CompiledXrefPattern } from '@refrakt-md/runes';
import type { PageSeo, HeadingInfo } from '@refrakt-md/runes';
import type { Plugin, PipelineWarning, AggregatedData, SecurityPolicy, ContributedPage } from '@refrakt-md/types';
import { resolveSecurityPolicy } from '@refrakt-md/types';
import type { PipelineStats } from './pipeline.js';
import { ContentTree, type PartialFile } from './content-tree.js';
import { parseFrontmatter, Frontmatter } from './frontmatter.js';
import { Router, Route } from './router.js';
import { resolveLayouts, ResolvedLayout } from './layout.js';
import { resolveTintCascade, type ResolvedTintCascade } from './tint-cascade.js';
import { NavTree } from './navigation.js';
import { runPipeline, type HookSet } from './pipeline.js';
import { createEntityRoutesHooks } from './entity-routes.js';
import { getGitTimestamps, resolveTimestamps, type FileTimestamps } from './timestamps.js';
import { readFileRoots, type FileRoots } from './file-roots.js';

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

/** Synchronous file reader that returns null on failure. */
function sandboxReadFile(p: string): string | null {
  try { return readFileSync(p, 'utf-8'); }
  catch { return null; }
}

/** Synchronous directory listing that returns empty array on failure. */
function sandboxListDir(p: string): string[] {
  try { return readdirSync(p); }
  catch { return []; }
}

/** Check if a path is an existing directory. */
function sandboxDirExists(p: string): boolean {
  try { return statSync(p).isDirectory(); }
  catch { return false; }
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
): { renderable: RenderableTreeNodes; headings: HeadingInfo[] } {
  const headings = extractHeadings(ast);
  const mergedTags = additionalTags ? { ...tags, ...additionalTags } : tags;
  // Capture deferBody runes' bodies as source before transform, so their
  // per-entity `$item` templates aren't resolved here (SPEC-070 / WORK-262).
  captureDeferredBodies(ast, (name) => Boolean((mergedTags as Record<string, { deferBody?: boolean }>)[name]?.deferBody));
  const config: Record<string, unknown> = { tags: mergedTags, nodes, functions, variables: {
    generatedIds: new Set<string>(), path, headings, __source: content, __sourcePath: sourcePath,
    ...(icons ? { __icons: icons } : {}),
    ...contentVariables,
  } };
  if (partials) {
    config.partials = partials;
  }
  return { renderable: Markdoc.transform(ast, config as any), headings };
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

interface SandboxHooks {
  read: (p: string) => string | null;
  list: (p: string) => string[];
  exists: (p: string) => boolean;
}

const nullSandboxHooks: SandboxHooks = {
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
  sandbox?: SandboxHooks;
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
}

async function processContentTree(
  tree: ContentTree,
  opts: ProcessContentTreeOptions,
): Promise<Site> {
  const resolvedSecurity = resolveSecurityPolicy(opts.securityPolicy);
  const router = new Router(opts.basePath ?? '/');
  const pages: SitePage[] = [];
  const sandbox = opts.sandbox ?? nullSandboxHooks;
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
  const namespacedPartials = opts.fileRoots && Object.keys(opts.fileRoots).length > 0
    ? await readFileRoots(opts.fileRoots)
    : new Map<string, PartialFile>();
  let parsedPartials: Record<string, Node> | undefined;
  if (partialFiles.size > 0 || namespacedPartials.size > 0) {
    parsedPartials = {};
    for (const [name, partial] of partialFiles) {
      parsedPartials[name] = Markdoc.parse(escapeFenceTags(partial.raw));
    }
    for (const [name, partial] of namespacedPartials) {
      parsedPartials[name] = Markdoc.parse(escapeFenceTags(partial.raw));
    }
  }

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
  const embedTags = opts.additionalTags ? { ...tags, ...opts.additionalTags } : tags;
  // SPEC-072 — collect plugin-declared (type, field) ordering overrides so
  // collection/relationships sort & group in domain order. Defaults still come
  // from each rune's attribute `matches`; these only cover the divergent cases.
  const orderings: Record<string, Record<string, string[]>> = {};
  for (const pkg of opts.plugins ?? []) {
    const o = pkg.theme?.orderings;
    if (!o) continue;
    for (const [type, fields] of Object.entries(o)) {
      orderings[type] = { ...(orderings[type] ?? {}), ...fields };
    }
  }
  const coreHooksOptions = {
    xrefPatterns: opts.xrefPatterns,
    repoUrl: opts.repoUrl,
    repoBranch: opts.repoBranch,
    embedConfig: {
      tags: embedTags as Record<string, unknown>,
      nodes: nodes as Record<string, unknown>,
      functions: functions as Record<string, unknown>,
      orderings,
      // Pass parsed partials so `{% partial file="…" /%}` inside a collection
      // body template (or an expand-resolved entity body) resolves the same
      // way it would inside a top-level page. Without this, partial nodes in
      // deferred templates silently render as empty `<article>` tags.
      partials: parsedPartials,
      projectRoot: opts.projectRoot,
    },
  };
  // Always thread embedConfig: collection (SPEC-070) and expand (SPEC-066) need
  // the merged tags/nodes/functions to transform per-entity templates, even
  // when a site sets no xref patterns or project root.
  const coreHooks = createCorePipelineHooks(coreHooksOptions);
  const hookSets: HookSet[] = [{ pluginName: '__core__', hooks: coreHooks }];
  for (const pkg of opts.plugins ?? []) {
    if (pkg.pipeline) {
      hookSets.push({ pluginName: pkg.name, hooks: pkg.pipeline });
    }
  }
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

  // Per-page preprocess context — file-system + project-root shared with the
  // transform-time sandbox but exposed at preprocess time (variables aren't
  // available yet). Warnings accumulate into a per-page array that callers
  // funnel through the standard pipeline-warnings surface.
  const preprocessWarnings: { severity: 'info' | 'warning' | 'error'; message: string; url?: string }[] = [];
  const makePreprocessCtx = (pageUrl: string, variables?: Record<string, unknown>) => ({
    info(message: string, url?: string) { preprocessWarnings.push({ severity: 'info', message, url: url ?? pageUrl }); },
    warn(message: string, url?: string) { preprocessWarnings.push({ severity: 'warning', message, url: url ?? pageUrl }); },
    error(message: string, url?: string) { preprocessWarnings.push({ severity: 'error', message, url: url ?? pageUrl }); },
    projectRoot: opts.projectRoot,
    sandbox: opts.sandbox,
    variables,
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
    const pagePath = posixPath(page.relativePath);
    const filePath = opts.projectRoot
      ? posixRelativeFromRoot(opts.projectRoot, page.filePath)
      : pagePath;
    const contentVariables: Record<string, unknown> = {
      ...opts.variables,
      frontmatter,
      page: {
        url: route.url,
        path: pagePath,
        dir: posixDirname(page.relativePath),
        slug: lastUrlSegment(route.url),
        title: derivePageTitle(frontmatter, ast),
        draft: route.draft,
      },
      file: {
        path: filePath,
        created: fileTimestamps.created,
        modified: fileTimestamps.modified,
      },
      __sandboxReadFile: sandbox.read,
      __sandboxListDir: sandbox.list,
      __sandboxDirExists: sandbox.exists,
      __sandboxExamplesDir: opts.sandboxExamplesDir,
      __securityPolicy: resolvedSecurity,
    };

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

    const { renderable, headings } = transformContent(
      ast,
      content,
      route.url,
      page.relativePath,
      opts.icons,
      opts.additionalTags,
      contentVariables,
      parsedPartials,
    );
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
      __sandboxReadFile: sandbox.read,
      __sandboxListDir: sandbox.list,
      __sandboxDirExists: sandbox.exists,
      __sandboxExamplesDir: opts.sandboxExamplesDir,
      __securityPolicy: resolvedSecurity,
      // Per-contribution bound variables (e.g. entityRoutes binds `item`).
      ...(cp.variables ?? {}),
    };
    const { renderable, headings } = transformContent(
      ast, cp.content, url, relativePath, opts.icons, opts.additionalTags, contentVariables, parsedPartials,
    );
    const seo = extractSeo(renderable, frontmatter, url);
    const tintCascade = resolveTintCascade(layoutPage, tree.root, { colorScheme: opts.colorScheme });
    return {
      route: { url, filePath: `<contributed:${cp.source?.plugin ?? 'plugin'}>`, draft: frontmatter.draft === true },
      frontmatter, content: cp.content, renderable, headings, layout, seo, tintCascade,
      source: { type: 'contributed', plugin: cp.source?.plugin, ruleIndex: cp.source?.ruleIndex },
    };
  };

  // `hookSets` were built before the per-page loop so the preprocess phase
  // could run during page processing. They're reused here for register /
  // contribute / aggregate / postProcess.
  const { pages: enrichedPages, warnings, stats, aggregated } = await runPipeline(pages, hookSets, {
    renderContributed,
    projectRoot: opts.projectRoot,
    siteConfig: opts.siteConfig,
  });

  // Funnel any preprocess-phase diagnostics (file-not-found, sandbox rejections,
  // line-range clamps) into the same warnings array the rest of the pipeline
  // uses. Preprocess runs before `runPipeline`, so its warnings would otherwise
  // be invisible to adapters that only print the pipeline summary.
  for (const w of preprocessWarnings) {
    warnings.push({ severity: w.severity, phase: 'register', pluginName: '__preprocess__', url: w.url, message: w.message });
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
        const resolved = resolveCoreSentinels(region.content, page.route.url, coreData, ctx, navSearchScope) as typeof region.content;
        if (resolved !== region.content) {
          mutated = true;
          resolvedRegions.set(name, { ...region, content: resolved });
        } else {
          resolvedRegions.set(name, region);
        }
      }
      if (mutated) {
        (page.layout as { regions: typeof page.layout.regions }).regions = resolvedRegions as typeof page.layout.regions;
      }
    }
  }

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
    info(message: string, infoUrl?: string) { warnings.push({ severity: 'info', phase: 'postProcess', pluginName: '__core__/regions', url: infoUrl ?? url, message }); },
    warn(message: string, warnUrl?: string) { warnings.push({ severity: 'warning', phase: 'postProcess', pluginName: '__core__/regions', url: warnUrl ?? url, message }); },
    error(message: string, errUrl?: string) { warnings.push({ severity: 'error', phase: 'postProcess', pluginName: '__core__/regions', url: errUrl ?? url, message }); },
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
export async function loadContent(
  dirPath: string,
  basePath: string = '/',
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
  const tree = await ContentTree.fromDirectory(dirPath);
  const resolvedExamplesDir = sandboxExamplesDir
    ? resolve(sandboxExamplesDir)
    : resolve(dirPath, '..', 'examples');
  // Default to the content directory's parent (the common
  // `<project>/site/content/` → `<project>/site/` layout). Adapters that
  // know the real project root (the directory containing
  // `refrakt.config.json`) should pass it explicitly.
  const resolvedProjectRoot = projectRoot ?? resolve(dirPath, '..');

  return processContentTree(tree, {
    basePath,
    icons,
    additionalTags,
    plugins: packages,
    variables,
    securityPolicy,
    gitTimestamps: getGitTimestamps(dirPath),
    sandbox: {
      read: sandboxReadFile,
      list: sandboxListDir,
      exists: sandboxDirExists,
    },
    sandboxExamplesDir: resolvedExamplesDir,
    projectRoot: resolvedProjectRoot,
    xrefPatterns,
    fileRoots,
    siteConfig,
    repoUrl,
    repoBranch,
  });
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
 * - No git history — timestamps come from frontmatter only.
 * - No sandbox filesystem access — sandbox runes resolve to null/empty.
 *   (Provide `__sandboxReadFile` etc. via `variables` if your host has its own
 *   synchronous access strategy.)
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
  });
}
