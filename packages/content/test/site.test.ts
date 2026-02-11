import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { loadContent } from '../src/site.js';

const fixtureDir = path.resolve(import.meta.dirname, 'fixtures/site');

describe('loadContent', () => {
  it('should load a content directory into a site', async () => {
    const site = await loadContent(fixtureDir);

    expect(site.tree).toBeDefined();
    expect(site.pages.length).toBeGreaterThan(0);
  });

  it('should resolve routes for all pages', async () => {
    const site = await loadContent(fixtureDir);

    const urls = site.pages.map(p => p.route.url);
    expect(urls).toContain('/');  // index.md
    expect(urls).toContain('/blog/first-post');
  });

  it('should apply slug override from frontmatter', async () => {
    const site = await loadContent(fixtureDir);

    const installation = site.pages.find(p => p.route.filePath.includes('02-installation'));
    expect(installation).toBeDefined();
    expect(installation!.route.url).toBe('/docs/install');
  });

  it('should flag draft pages', async () => {
    const site = await loadContent(fixtureDir);

    const draft = site.pages.find(p => p.route.filePath.includes('draft-post'));
    expect(draft).toBeDefined();
    expect(draft!.route.draft).toBe(true);
  });

  it('should parse frontmatter for pages', async () => {
    const site = await loadContent(fixtureDir);

    const home = site.pages.find(p => p.route.url === '/');
    expect(home).toBeDefined();
    expect(home!.frontmatter.title).toBe('Home');
    expect(home!.frontmatter.description).toBe('Welcome to the site');
  });

  it('should strip content of frontmatter', async () => {
    const site = await loadContent(fixtureDir);

    const home = site.pages.find(p => p.route.url === '/');
    expect(home).toBeDefined();
    expect(home!.content).not.toContain('---');
    expect(home!.content).toContain('# Welcome');
  });

  it('should resolve layout chain', async () => {
    const site = await loadContent(fixtureDir);

    const docsPage = site.pages.find(p => p.route.filePath.includes('01-getting-started'));
    expect(docsPage).toBeDefined();
    // Should have both root layout and docs layout
    expect(docsPage!.layout.chain.length).toBe(2);
  });

  it('should have root layout for top-level pages', async () => {
    const site = await loadContent(fixtureDir);

    const home = site.pages.find(p => p.route.url === '/');
    expect(home).toBeDefined();
    expect(home!.layout.chain.length).toBe(1);
  });
});
