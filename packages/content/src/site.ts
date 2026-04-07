import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes, Schema } from '@markdoc/markdoc';
import { tags, nodes, extractHeadings, extractSeo, corePipelineHooks, escapeFenceTags } from '@refrakt-md/runes';
import type { PageSeo, HeadingInfo } from '@refrakt-md/runes';
import type { RunePackage, PipelineWarning, AggregatedData } from '@refrakt-md/types';
import type { PipelineStats } from './pipeline.js';
import { ContentTree, type PartialFile } from './content-tree.js';
import { parseFrontmatter, Frontmatter } from './frontmatter.js';
import { Router, Route } from './router.js';
import { resolveLayouts, ResolvedLayout } from './layout.js';
import { NavTree } from './navigation.js';
import { runPipeline, type HookSet } from './pipeline.js';
import { getGitTimestamps, resolveTimestamps } from './timestamps.js';

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
  partials?: Record<string, Node>,
): { renderable: RenderableTreeNodes; headings: HeadingInfo[] } {
  const ast = Markdoc.parse(escapeFenceTags(content));
  const headings = extractHeadings(ast);
  const mergedTags = additionalTags ? { ...tags, ...additionalTags } : tags;
  const config: Record<string, unknown> = { tags: mergedTags, nodes, variables: {
    generatedIds: new Set<string>(), path, headings, __source: content,
    ...(icons ? { __icons: icons } : {}),
    ...contentVariables,
  } };
  if (partials) {
    config.partials = partials;
  }
  return { renderable: Markdoc.transform(ast, config as any), headings };
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
  variables?: Record<string, unknown>,
): Promise<Site> {
  const tree = await ContentTree.fromDirectory(dirPath);
  const router = new Router(basePath);
  const pages: SitePage[] = [];

  // Resolve examples directory for sandbox src support
  const resolvedExamplesDir = sandboxExamplesDir
    ? resolve(sandboxExamplesDir)
    : resolve(dirPath, '..', 'examples');
  
  // Pre-parse partials into Markdoc ASTs for the transform config
  const partialFiles = tree.partials();
  let parsedPartials: Record<string, Node> | undefined;
  if (partialFiles.size > 0) {
    parsedPartials = {};
    for (const [name, partial] of partialFiles) {
      parsedPartials[name] = Markdoc.parse(escapeFenceTags(partial.raw));
    }
  }

  // Batch-collect git timestamps once before the page loop
  const gitTimestamps = getGitTimestamps(dirPath);

  for (const page of tree.pages()) {
    const { frontmatter, content } = parseFrontmatter(page.raw);
    const route = router.resolve(page.relativePath, frontmatter);
    const layout = resolveLayouts(page, tree.root, icons);
    const fileTimestamps = resolveTimestamps(
      page.relativePath,
      page.filePath,
      gitTimestamps,
      frontmatter,
    );
    const contentVariables: Record<string, unknown> = {
      ...variables,
      frontmatter,
      page: { url: route.url, filePath: route.filePath, draft: route.draft },
      file: {
        created: fileTimestamps.created,
        modified: fileTimestamps.modified,
      },
      __sandboxReadFile: sandboxReadFile,
      __sandboxListDir: sandboxListDir,
      __sandboxDirExists: sandboxDirExists,
      __sandboxExamplesDir: resolvedExamplesDir,
    };
    const { renderable, headings } = transformContent(content, route.url, icons, additionalTags, contentVariables, parsedPartials);
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
    partials: partialFiles,
  };
}
