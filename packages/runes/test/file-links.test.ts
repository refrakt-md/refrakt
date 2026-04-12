import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { nodes } from '../src/index.js';

const { Tag } = Markdoc;

/** Minimal transform that only exercises the link node with the given variables. */
function transformLink(markdown: string, variables: Record<string, unknown> = {}) {
  const ast = Markdoc.parse(markdown);
  const config = {
    nodes,
    variables: { generatedIds: new Set<string>(), ...variables },
  };
  const tree = Markdoc.transform(ast, config);
  return tree;
}

/** Walk the tree and collect all <a> tags. */
function collectLinks(node: unknown): Array<{ href: string; children: unknown[] }> {
  const results: Array<{ href: string; children: unknown[] }> = [];
  if (Tag.isTag(node)) {
    if (node.name === 'a') {
      results.push({ href: node.attributes.href, children: node.children });
    }
    for (const child of node.children) {
      results.push(...collectLinks(child));
    }
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      results.push(...collectLinks(child));
    }
  }
  return results;
}

describe('file link resolution', () => {
  const urls: Record<string, string> = {
    'getting-started.md': '/getting-started',
    'docs/index.md': '/docs',
    'docs/01-intro.md': '/docs/intro',
    'docs/02-api/index.md': '/docs/api',
    'docs/02-api/reference.md': '/docs/api/reference',
    'guides/setup.md': '/guides/setup',
    'about.md': '/about',
  };

  it('resolves a relative .md link from root file', () => {
    const tree = transformLink('[link](getting-started.md)', {
      filePath: 'index.md',
      urls,
    });
    const links = collectLinks(tree);
    expect(links).toHaveLength(1);
    expect(links[0].href).toBe('/getting-started');
  });

  it('resolves a relative .md link with ./ prefix', () => {
    const tree = transformLink('[link](./getting-started.md)', {
      filePath: 'index.md',
      urls,
    });
    const links = collectLinks(tree);
    expect(links[0].href).toBe('/getting-started');
  });

  it('resolves a .md link from a nested file', () => {
    const tree = transformLink('[link](./01-intro.md)', {
      filePath: 'docs/some-page.md',
      urls,
    });
    const links = collectLinks(tree);
    expect(links[0].href).toBe('/docs/intro');
  });

  it('resolves a parent-relative .md link (..)', () => {
    const tree = transformLink('[link](../about.md)', {
      filePath: 'docs/01-intro.md',
      urls,
    });
    const links = collectLinks(tree);
    expect(links[0].href).toBe('/about');
  });

  it('resolves a sibling directory .md link', () => {
    const tree = transformLink('[link](../guides/setup.md)', {
      filePath: 'docs/01-intro.md',
      urls,
    });
    const links = collectLinks(tree);
    expect(links[0].href).toBe('/guides/setup');
  });

  it('resolves an index.md link to the directory URL', () => {
    const tree = transformLink('[link](./02-api/index.md)', {
      filePath: 'docs/01-intro.md',
      urls,
    });
    const links = collectLinks(tree);
    expect(links[0].href).toBe('/docs/api');
  });

  it('preserves fragment on resolved file links', () => {
    const tree = transformLink('[link](./01-intro.md#installation)', {
      filePath: 'docs/some-page.md',
      urls,
    });
    const links = collectLinks(tree);
    expect(links[0].href).toBe('/docs/intro#installation');
  });

  it('resolves absolute .md paths from content root', () => {
    const tree = transformLink('[link](/docs/02-api/reference.md)', {
      filePath: 'guides/setup.md',
      urls,
    });
    const links = collectLinks(tree);
    expect(links[0].href).toBe('/docs/api/reference');
  });

  it('leaves unresolvable .md links unchanged', () => {
    const tree = transformLink('[link](./nonexistent.md)', {
      filePath: 'docs/01-intro.md',
      urls,
    });
    const links = collectLinks(tree);
    expect(links[0].href).toBe('./nonexistent.md');
  });

  it('does not touch non-.md links', () => {
    const tree = transformLink('[link](/docs/intro)', {
      filePath: 'docs/01-intro.md',
      urls,
    });
    const links = collectLinks(tree);
    expect(links[0].href).toBe('/docs/intro');
  });

  it('does not touch external links', () => {
    const tree = transformLink('[link](https://example.com/page.md)', {
      filePath: 'index.md',
      urls,
    });
    const links = collectLinks(tree);
    expect(links[0].href).toBe('https://example.com/page.md');
  });

  it('works without urls map (no-op)', () => {
    const tree = transformLink('[link](./page.md)', {
      filePath: 'index.md',
    });
    const links = collectLinks(tree);
    expect(links[0].href).toBe('./page.md');
  });

  it('works without filePath (falls back to URL-space resolution)', () => {
    const tree = transformLink('[link](./intro)', {
      path: '/docs/page',
      urls: { '/docs/intro': '/docs/intro' },
    });
    const links = collectLinks(tree);
    expect(links[0].href).toBe('/docs/intro');
  });
});
