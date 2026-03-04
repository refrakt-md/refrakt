import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes, Schema } from '@markdoc/markdoc';
import { tags, nodes, extractHeadings, runes, extractSeo, buildSeoTypeMap, corePipelineHooks } from '@refrakt-md/runes';
import type { PageSeo, HeadingInfo } from '@refrakt-md/runes';
import type { RunePackage, PipelineWarning } from '@refrakt-md/types';
import type { PipelineStats } from './pipeline.js';
import { ContentTree } from './content-tree.js';
import { parseFrontmatter, Frontmatter } from './frontmatter.js';
import { Router, Route } from './router.js';
import { resolveLayouts, ResolvedLayout } from './layout.js';
import { NavTree } from './navigation.js';
import { runPipeline, type HookSet } from './pipeline.js';

const seoTypeMap = buildSeoTypeMap(runes);

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

function transformContent(
  content: string,
  path: string,
  icons?: Record<string, Record<string, string>>,
  additionalTags?: Record<string, Schema>,
): { renderable: RenderableTreeNodes; headings: HeadingInfo[] } {
  const ast = Markdoc.parse(content);
  const headings = extractHeadings(ast);
  const mergedTags = additionalTags ? { ...tags, ...additionalTags } : tags;
  const config = { tags: mergedTags, nodes, variables: {
    generatedIds: new Set<string>(), path, headings, __source: content,
    ...(icons ? { __icons: icons } : {}),
  } };
  return { renderable: Markdoc.transform(ast, config), headings };
}

/**
 * Load a content directory and resolve all pages, routes, layouts, and navigation.
 *
 * When `packages` are provided, the cross-page pipeline runs after loading:
 * core hooks + package hooks register entities, aggregate cross-page data,
 * and post-process pages before returning.
 */
export async function loadContent(
  dirPath: string,
  basePath: string = '/',
  icons?: Record<string, Record<string, string>>,
  additionalTags?: Record<string, Schema>,
  packages?: RunePackage[],
): Promise<Site> {
  const tree = await ContentTree.fromDirectory(dirPath);
  const router = new Router(basePath);
  const pages: SitePage[] = [];

  for (const page of tree.pages()) {
    const { frontmatter, content } = parseFrontmatter(page.raw);
    const route = router.resolve(page.relativePath, frontmatter);
    const layout = resolveLayouts(page, tree.root, icons);
    const { renderable, headings } = transformContent(content, route.url, icons, additionalTags);
    const seo = extractSeo(renderable, seoTypeMap, frontmatter, route.url);

    pages.push({ route, frontmatter, content, renderable, headings, layout, seo });
  }

  // Build hook sets: core always runs first, then community packages in config order
  const hookSets: HookSet[] = [{ packageName: '__core__', hooks: corePipelineHooks }];
  for (const pkg of packages ?? []) {
    if (pkg.pipeline) {
      hookSets.push({ packageName: pkg.name, hooks: pkg.pipeline });
    }
  }

  const { pages: enrichedPages, warnings, stats } = await runPipeline(pages, hookSets);

  return {
    tree,
    pages: enrichedPages,
    navigation: [], // TODO: Extract from resolved layouts
    pipelineWarnings: warnings,
    pipelineStats: stats,
  };
}
