import { describe, it, expect } from 'vitest';
import { Router } from '../src/router.js';

describe('Router', () => {
  const router = new Router('/');

  describe('Layer 1: filePathToUrl', () => {
    it('should strip .md extension', () => {
      expect(router.filePathToUrl('about.md')).toBe('/about');
    });

    it('should convert index.md to directory root', () => {
      expect(router.filePathToUrl('index.md')).toBe('/');
    });

    it('should handle nested index.md', () => {
      expect(router.filePathToUrl('docs/index.md')).toBe('/docs');
    });

    it('should strip numeric prefixes', () => {
      expect(router.filePathToUrl('docs/01-getting-started.md')).toBe('/docs/getting-started');
    });

    it('should strip numeric prefixes from directories', () => {
      expect(router.filePathToUrl('01-guides/02-setup.md')).toBe('/guides/setup');
    });

    it('should handle nested paths', () => {
      expect(router.filePathToUrl('docs/api/reference.md')).toBe('/docs/api/reference');
    });
  });

  describe('Layer 2: resolve', () => {
    it('should apply slug override', () => {
      const route = router.resolve('docs/02-installation.md', { slug: '/docs/install' });
      expect(route.url).toBe('/docs/install');
    });

    it('should flag draft pages', () => {
      const route = router.resolve('blog/draft.md', { draft: true });
      expect(route.draft).toBe(true);
    });

    it('should flag redirects', () => {
      const route = router.resolve('old-page.md', { redirect: '/new-page' });
      expect(route.redirect).toBe('/new-page');
    });

    it('should use file path when no slug override', () => {
      const route = router.resolve('docs/01-getting-started.md', { title: 'Getting Started' });
      expect(route.url).toBe('/docs/getting-started');
    });

    it('should default draft to false', () => {
      const route = router.resolve('page.md', {});
      expect(route.draft).toBe(false);
    });
  });

  describe('custom base path', () => {
    const prefixed = new Router('/site');

    it('should prepend base path', () => {
      expect(prefixed.filePathToUrl('about.md')).toBe('/site/about');
    });

    it('should handle index with base path', () => {
      expect(prefixed.filePathToUrl('index.md')).toBe('/site/');
    });
  });
});
