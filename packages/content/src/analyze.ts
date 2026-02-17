import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, RenderableTreeNodes } from '@markdoc/markdoc';
import type { SitePage } from './site.js';

const { Tag } = Markdoc;

export interface RuneUsageReport {
  /** All unique typeof values found across all pages */
  allTypes: Set<string>;
  /** Per-page breakdown: route URL → set of typeof values */
  perPage: Map<string, Set<string>>;
}

/** Walk a renderable tree and collect all typeof attribute values. */
export function collectRuneTypes(node: RenderableTreeNodes): Set<string> {
  const types = new Set<string>();

  function walk(n: RenderableTreeNode) {
    if (n == null) return;
    if (Tag.isTag(n)) {
      const t = n.attributes?.typeof;
      if (typeof t === 'string') types.add(t);
      for (const child of n.children) walk(child);
    } else if (Array.isArray(n)) {
      for (const child of n) walk(child);
    }
  }

  if (Array.isArray(node)) {
    for (const n of node) walk(n as RenderableTreeNode);
  } else {
    walk(node as RenderableTreeNode);
  }

  return types;
}

/** Analyze all pages in a site for rune usage. */
export function analyzeRuneUsage(pages: SitePage[]): RuneUsageReport {
  const allTypes = new Set<string>();
  const perPage = new Map<string, Set<string>>();

  for (const page of pages) {
    const pageTypes = collectRuneTypes(page.renderable);

    // Walk layout region renderables — runes like Nav only exist here
    for (const region of page.layout.regions.values()) {
      for (const regionNode of region.content) {
        for (const t of collectRuneTypes(regionNode)) {
          pageTypes.add(t);
        }
      }
    }

    perPage.set(page.route.url, pageTypes);
    for (const t of pageTypes) allTypes.add(t);
  }

  return { allTypes, perPage };
}
