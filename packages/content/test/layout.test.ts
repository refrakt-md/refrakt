import { describe, it, expect } from 'vitest';
import { Tag } from '@markdoc/markdoc';
import * as path from 'node:path';
import { loadContent } from '../src/site.js';

const fixtureDir = path.resolve(import.meta.dirname, 'fixtures/site');

describe('layout region merging', () => {
  it('should extract regions from root layout', async () => {
    const site = await loadContent(fixtureDir);

    const home = site.pages.find(p => p.route.url === '/');
    expect(home).toBeDefined();

    const regions = home!.layout.regions;
    expect(regions.has('header')).toBe(true);
    expect(regions.has('nav')).toBe(true);
  });

  it('should have header region with content', async () => {
    const site = await loadContent(fixtureDir);

    const home = site.pages.find(p => p.route.url === '/');
    const header = home!.layout.regions.get('header');
    expect(header).toBeDefined();
    expect(header!.content.length).toBeGreaterThan(0);

    // Header should contain a heading tag
    const hasHeading = header!.content.some(node =>
      Tag.isTag(node) && /^h[1-6]$/.test(node.name)
    );
    expect(hasHeading).toBe(true);
  });

  it('should have nav region with Nav component', async () => {
    const site = await loadContent(fixtureDir);

    const home = site.pages.find(p => p.route.url === '/');
    const nav = home!.layout.regions.get('nav');
    expect(nav).toBeDefined();
    expect(nav!.content.length).toBeGreaterThan(0);
  });

  it('should inherit root regions in child directories', async () => {
    const site = await loadContent(fixtureDir);

    const docsPage = site.pages.find(p => p.route.filePath.includes('getting-started'));
    expect(docsPage).toBeDefined();

    const regions = docsPage!.layout.regions;
    // Should have root layout regions
    expect(regions.has('header')).toBe(true);
    expect(regions.has('nav')).toBe(true);
    // Plus docs-specific sidebar
    expect(regions.has('sidebar')).toBe(true);
  });

  it('should default region mode to replace', async () => {
    const site = await loadContent(fixtureDir);

    const home = site.pages.find(p => p.route.url === '/');
    const header = home!.layout.regions.get('header');
    expect(header!.mode).toBe('replace');
  });
});
