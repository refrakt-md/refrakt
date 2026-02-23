import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { tags, nodes } from '@refrakt-md/runes';
import { ContentDirectory, ContentPage } from './content-tree.js';
import { parseFrontmatter } from './frontmatter.js';

export interface Region {
  name: string;
  mode: 'replace' | 'prepend' | 'append';
  content: RenderableTreeNode[];
}

export interface ResolvedLayout {
  /** The chain of layout files from root to nearest, in order */
  chain: ContentPage[];
  /** Merged regions after applying inheritance */
  regions: Map<string, Region>;
}

/**
 * Resolve the layout chain for a page by walking up the directory tree.
 * Collects all _layout.md files from the page's directory up to the root.
 */
export function resolveLayouts(
  page: ContentPage,
  rootDir: ContentDirectory,
  icons?: Record<string, Record<string, string>>
): ResolvedLayout {
  const chain = findLayoutChain(page, rootDir);
  const regions = mergeRegions(chain, icons);
  return { chain, regions };
}

/**
 * Find all _layout.md files from root down to the page's directory.
 */
function findLayoutChain(
  page: ContentPage,
  rootDir: ContentDirectory
): ContentPage[] {
  const parts = page.relativePath.split('/').slice(0, -1); // directory segments
  const chain: ContentPage[] = [];

  let current: ContentDirectory | undefined = rootDir;

  // Root layout
  if (current.layout) {
    chain.push(current.layout);
  }

  // Walk down through directories toward the page
  for (const part of parts) {
    current = current.children.find(c => c.name === part);
    if (!current) break;
    if (current.layout) {
      chain.push(current.layout);
    }
  }

  return chain;
}

/**
 * Parse a layout file through Markdoc and extract regions.
 */
function parseLayout(layoutPage: ContentPage, icons?: Record<string, Record<string, string>>): { name: string; mode: Region['mode']; content: RenderableTreeNode[] }[] {
  const { content } = parseFrontmatter(layoutPage.raw);
  const ast = Markdoc.parse(content);
  const config = { tags, nodes, variables: {
    generatedIds: new Set<string>(), path: layoutPage.relativePath, __source: content,
    ...(icons ? { __icons: icons } : {}),
  } };
  const rendered = Markdoc.transform(ast, config);

  const regions: { name: string; mode: Region['mode']; content: RenderableTreeNode[] }[] = [];
  findRegions(rendered, regions);
  return regions;
}

/**
 * Recursively walk a rendered Tag tree to find data-region containers.
 */
function findRegions(
  node: RenderableTreeNodes,
  results: { name: string; mode: Region['mode']; content: RenderableTreeNode[] }[]
): void {
  if (Array.isArray(node)) {
    for (const child of node) {
      findRegions(child, results);
    }
    return;
  }

  if (!Tag.isTag(node)) return;

  const regionName = node.attributes['data-region'];
  if (regionName) {
    const mode = (node.attributes['data-mode'] as Region['mode']) || 'replace';
    results.push({ name: regionName, mode, content: node.children });
    return; // Don't recurse into region children — they're the region's content
  }

  // Recurse into non-region tags (e.g., the layout wrapper div)
  for (const child of node.children) {
    findRegions(child, results);
  }
}

/**
 * Merge regions from a layout chain.
 * Later layouts in the chain can replace, prepend, or append to earlier regions.
 */
function mergeRegions(chain: ContentPage[], icons?: Record<string, Record<string, string>>): Map<string, Region> {
  const merged = new Map<string, Region>();

  for (const layoutPage of chain) {
    const regions = parseLayout(layoutPage, icons);

    for (const { name, mode, content } of regions) {
      const existing = merged.get(name);

      if (!existing || mode === 'replace') {
        merged.set(name, { name, mode, content });
      } else if (mode === 'prepend') {
        merged.set(name, { name, mode: existing.mode, content: [...content, ...existing.content] });
      } else if (mode === 'append') {
        merged.set(name, { name, mode: existing.mode, content: [...existing.content, ...content] });
      }
    }
  }

  return merged;
}
