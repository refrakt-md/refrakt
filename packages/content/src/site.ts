import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes, Schema } from '@markdoc/markdoc';
import { tags, nodes, extractHeadings, runes, extractSeo, buildSeoTypeMap } from '@refrakt-md/runes';
import type { PageSeo, HeadingInfo } from '@refrakt-md/runes';
import { ContentTree } from './content-tree.js';
import { parseFrontmatter, Frontmatter } from './frontmatter.js';
import { Router, Route } from './router.js';
import { resolveLayouts, ResolvedLayout } from './layout.js';
import { NavTree } from './navigation.js';

const seoTypeMap = buildSeoTypeMap(runes);

export interface Site {
  /** The content tree */
  tree: ContentTree;
  /** All resolved pages with routes and layouts */
  pages: SitePage[];
  /** Navigation trees found in layouts */
  navigation: NavTree[];
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
 */
export async function loadContent(
  dirPath: string,
  basePath: string = '/',
  icons?: Record<string, Record<string, string>>,
  additionalTags?: Record<string, Schema>,
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

  return {
    tree,
    pages,
    navigation: [], // TODO: Extract from resolved layouts
  };
}
