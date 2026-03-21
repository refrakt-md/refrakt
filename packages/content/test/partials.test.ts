import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { ContentTree } from '../src/content-tree.js';
import { loadContent } from '../src/site.js';

const fixtureDir = path.resolve(import.meta.dirname, 'fixtures/site');

describe('Partials', () => {
  describe('ContentTree', () => {
    it('should discover partial files in _partials/', async () => {
      const tree = await ContentTree.fromDirectory(fixtureDir);
      const partials = tree.partials();

      expect(partials.size).toBeGreaterThan(0);
      expect(partials.has('cta.md')).toBe(true);
    });

    it('should discover partials in subdirectories', async () => {
      const tree = await ContentTree.fromDirectory(fixtureDir);
      const partials = tree.partials();

      expect(partials.has(path.join('shared', 'disclaimer.md'))).toBe(true);
    });

    it('should not include partials as regular pages', async () => {
      const tree = await ContentTree.fromDirectory(fixtureDir);
      const pages = [...tree.pages()];
      const paths = pages.map(p => p.relativePath);

      // No partial files should appear as pages
      expect(paths.every(p => !p.includes('_partials'))).toBe(true);
    });

    it('should return empty map when no _partials/ directory exists', async () => {
      // Use a fixture without _partials
      const noPartialsDir = path.resolve(import.meta.dirname, 'fixtures/site/blog');
      const tree = await ContentTree.fromDirectory(noPartialsDir);
      const partials = tree.partials();

      expect(partials.size).toBe(0);
    });

    it('should store raw content of partials', async () => {
      const tree = await ContentTree.fromDirectory(fixtureDir);
      const partials = tree.partials();
      const cta = partials.get('cta.md');

      expect(cta).toBeDefined();
      expect(cta!.raw).toContain('Sign up today');
    });
  });

  describe('loadContent with partials', () => {
    it('should include partial content in pages that use them', async () => {
      const site = await loadContent(fixtureDir);

      const page = site.pages.find(p => p.route.filePath.includes('partials-test'));
      expect(page).toBeDefined();

      // The rendered output should contain the partial's content
      const html = JSON.stringify(page!.renderable);
      expect(html).toContain('Sign up today');
      expect(html).toContain('informational purposes');
    });

    it('should expose partials on the Site object', async () => {
      const site = await loadContent(fixtureDir);

      expect(site.partials).toBeDefined();
      expect(site.partials.size).toBeGreaterThan(0);
      expect(site.partials.has('cta.md')).toBe(true);
    });
  });
});
