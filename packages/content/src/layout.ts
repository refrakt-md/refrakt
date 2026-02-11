import { ContentDirectory, ContentPage } from './content-tree.js';

export interface Region {
  name: string;
  mode: 'replace' | 'prepend' | 'append';
  content: string;
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
  rootDir: ContentDirectory
): ResolvedLayout {
  const chain = findLayoutChain(page, rootDir);
  const regions = mergeRegions(chain);
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
 * Merge regions from a layout chain.
 * Later layouts in the chain can replace, prepend, or append to earlier regions.
 */
function mergeRegions(chain: ContentPage[]): Map<string, Region> {
  const merged = new Map<string, Region>();

  // Region extraction from parsed layout content happens at a higher level
  // (when Markdoc processes the {% layout %} and {% region %} tags).
  // This function receives the chain for later use during rendering.

  return merged;
}
