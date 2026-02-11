import { ContentTree } from './content-tree.js';
import { parseFrontmatter, Frontmatter } from './frontmatter.js';
import { Router, Route } from './router.js';
import { resolveLayouts, ResolvedLayout } from './layout.js';
import { NavTree } from './navigation.js';

export interface Site {
  /** The content tree */
  tree: ContentTree;
  /** All resolved pages with routes and layouts */
  pages: SitePage[];
  /** Navigation trees found in layouts */
  navigation: NavTree[];
}

interface SitePage {
  route: Route;
  frontmatter: Frontmatter;
  content: string;
  layout: ResolvedLayout;
}

/**
 * Load a content directory and resolve all pages, routes, layouts, and navigation.
 */
export async function loadContent(dirPath: string, basePath: string = '/'): Promise<Site> {
  const tree = await ContentTree.fromDirectory(dirPath);
  const router = new Router(basePath);
  const pages: SitePage[] = [];

  for (const page of tree.pages()) {
    const { frontmatter, content } = parseFrontmatter(page.raw);
    const route = router.resolve(page.relativePath, frontmatter);
    const layout = resolveLayouts(page, tree.root);

    pages.push({ route, frontmatter, content, layout });
  }

  return {
    tree,
    pages,
    navigation: [], // TODO: Extract from resolved layouts
  };
}
