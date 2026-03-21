import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes, Schema } from '@markdoc/markdoc';
import { tags, nodes, extractHeadings, extractSeo, corePipelineHooks } from '@refrakt-md/runes';
import type { PageSeo, HeadingInfo } from '@refrakt-md/runes';
import type { RunePackage, PipelineWarning, AggregatedData } from '@refrakt-md/types';
import type { PipelineStats } from './pipeline.js';
import { ContentTree } from './content-tree.js';
import { parseFrontmatter, Frontmatter } from './frontmatter.js';
import { Router, Route } from './router.js';
import { resolveLayouts, ResolvedLayout } from './layout.js';
import { NavTree } from './navigation.js';
import { runPipeline, type HookSet } from './pipeline.js';

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
}

export interface SitePage {
  route: Route;
  frontmatter: Frontmatter;
  content: string;
  renderable: RenderableTreeNodes;
  headings: HeadingInfo[];
  layout: ResolvedLayout;
  seo: PageSeo;
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
  icons?: Record<string, Record<string, string>>,
  additionalTags?: Record<string, Schema>,
  contentVariables?: Record<string, unknown>,
): { renderable: RenderableTreeNodes; headings: HeadingInfo[] } {
  const ast = Markdoc.parse(content);
  const headings = extractHeadings(ast);
  const mergedTags = additionalTags ? { ...tags, ...additionalTags } : tags;
  const config = { tags: mergedTags, nodes, variables: {
    generatedIds: new Set<string>(), path, headings, __source: content,
    ...(icons ? { __icons: icons } : {}),
    ...contentVariables,
  } };
  return { renderable: Markdoc.transform(ast, config), headings };
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
 */
export async function loadContent(
  dirPath: string,
  basePath: string = '/',
  icons?: Record<string, Record<string, string>>,
  additionalTags?: Record<string, Schema>,
  packages?: RunePackage[],
  sandboxExamplesDir?: string,
): Promise<Site> {
  const tree = await ContentTree.fromDirectory(dirPath);
  const router = new Router(basePath);
  const pages: SitePage[] = [];

  // Resolve examples directory for sandbox src support
  const resolvedExamplesDir = sandboxExamplesDir
    ? resolve(sandboxExamplesDir)
    : resolve(dirPath, '..', 'examples');

  for (const page of tree.pages()) {
    const { frontmatter, content } = parseFrontmatter(page.raw);
    const route = router.resolve(page.relativePath, frontmatter);
    const layout = resolveLayouts(page, tree.root, icons);
    const contentVariables: Record<string, unknown> = {
      frontmatter,
      page: { url: route.url, filePath: route.filePath, draft: route.draft },
      __sandboxReadFile: sandboxReadFile,
      __sandboxListDir: sandboxListDir,
      __sandboxDirExists: sandboxDirExists,
      __sandboxExamplesDir: resolvedExamplesDir,
    };
    const { renderable, headings } = transformContent(content, route.url, icons, additionalTags, contentVariables);
    const seo = extractSeo(renderable, frontmatter, route.url);

    pages.push({ route, frontmatter, content, renderable, headings, layout, seo });
  }

  // Build hook sets: core always runs first, then community packages in config order
  const hookSets: HookSet[] = [{ packageName: '__core__', hooks: corePipelineHooks }];
  for (const pkg of packages ?? []) {
    if (pkg.pipeline) {
      hookSets.push({ packageName: pkg.name, hooks: pkg.pipeline });
    }
  }

  const { pages: enrichedPages, warnings, stats, aggregated } = await runPipeline(pages, hookSets);

  return {
    tree,
    pages: enrichedPages,
    navigation: [], // TODO: Extract from resolved layouts
    pipelineWarnings: warnings,
    pipelineStats: stats,
    aggregated,
  };
}
