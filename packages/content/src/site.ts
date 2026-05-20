import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes, Schema } from '@markdoc/markdoc';
import { tags, nodes, extractHeadings, extractSeo, corePipelineHooks, escapeFenceTags, resolveCoreSentinels } from '@refrakt-md/runes';
import type { PageSeo, HeadingInfo } from '@refrakt-md/runes';
import type { Plugin, PipelineWarning, AggregatedData, SecurityPolicy } from '@refrakt-md/types';
import { resolveSecurityPolicy } from '@refrakt-md/types';
import type { PipelineStats } from './pipeline.js';
import { ContentTree, type PartialFile } from './content-tree.js';
import { parseFrontmatter, Frontmatter } from './frontmatter.js';
import { Router, Route } from './router.js';
import { resolveLayouts, ResolvedLayout } from './layout.js';
import { resolveTintCascade, type ResolvedTintCascade } from './tint-cascade.js';
import { NavTree } from './navigation.js';
import { runPipeline, type HookSet } from './pipeline.js';
import { getGitTimestamps, resolveTimestamps, type FileTimestamps } from './timestamps.js';

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
  content: string,
  path: string,
  sourcePath: string,
  icons?: Record<string, Record<string, string>>,
  additionalTags?: Record<string, Schema>,
  contentVariables?: Record<string, unknown>,
  partials?: Record<string, Node>,
): { renderable: RenderableTreeNodes; headings: HeadingInfo[] } {
  const ast = Markdoc.parse(escapeFenceTags(content));
  const headings = extractHeadings(ast);
  const mergedTags = additionalTags ? { ...tags, ...additionalTags } : tags;
  const config: Record<string, unknown> = { tags: mergedTags, nodes, variables: {
    generatedIds: new Set<string>(), path, headings, __source: content, __sourcePath: sourcePath,
    ...(icons ? { __icons: icons } : {}),
    ...contentVariables,
  } };
  if (partials) {
    config.partials = partials;
  }
  return { renderable: Markdoc.transform(ast, config as any), headings };
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

  // Pre-parse partials into Markdoc ASTs for the transform config
  const partialFiles = tree.partials();
  let parsedPartials: Record<string, Node> | undefined;
  if (partialFiles.size > 0) {
    parsedPartials = {};
    for (const [name, partial] of partialFiles) {
      parsedPartials[name] = Markdoc.parse(escapeFenceTags(partial.raw));
    }
  }

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
    const contentVariables: Record<string, unknown> = {
      ...opts.variables,
      frontmatter,
      page: { url: route.url, filePath: route.filePath, draft: route.draft },
      file: {
        created: fileTimestamps.created,
        modified: fileTimestamps.modified,
      },
      __sandboxReadFile: sandbox.read,
      __sandboxListDir: sandbox.list,
      __sandboxDirExists: sandbox.exists,
      __sandboxExamplesDir: opts.sandboxExamplesDir,
      __securityPolicy: resolvedSecurity,
    };
    const { renderable, headings } = transformContent(
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

  // Build hook sets: core always runs first, then plugins in config order
  const hookSets: HookSet[] = [{ pluginName: '__core__', hooks: corePipelineHooks }];
  for (const pkg of opts.plugins ?? []) {
    if (pkg.pipeline) {
      hookSets.push({ pluginName: pkg.name, hooks: pkg.pipeline });
    }
  }

  const { pages: enrichedPages, warnings, stats, aggregated } = await runPipeline(pages, hookSets);

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
): Promise<Site> {
  const tree = await ContentTree.fromDirectory(dirPath);
  const resolvedExamplesDir = sandboxExamplesDir
    ? resolve(sandboxExamplesDir)
    : resolve(dirPath, '..', 'examples');

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
  });
}
