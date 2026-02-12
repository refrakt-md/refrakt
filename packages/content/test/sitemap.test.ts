import { describe, it, expect } from 'vitest';
import { generateSitemap, type SitemapEntry } from '../src/sitemap.js';

describe('generateSitemap', () => {
	it('should produce valid XML with loc and priority', () => {
		const pages: SitemapEntry[] = [
			{ url: '/', draft: false },
			{ url: '/about', draft: false },
		];

		const xml = generateSitemap(pages, 'https://example.com');

		expect(xml).toContain('<?xml version="1.0"');
		expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
		expect(xml).toContain('<loc>https://example.com/</loc>');
		expect(xml).toContain('<loc>https://example.com/about</loc>');
	});

	it('should assign priority 1.0 to root page', () => {
		const pages: SitemapEntry[] = [{ url: '/', draft: false }];
		const xml = generateSitemap(pages, 'https://example.com');

		expect(xml).toContain('<priority>1.0</priority>');
	});

	it('should assign priority 0.8 to shallow pages', () => {
		const pages: SitemapEntry[] = [{ url: '/about', draft: false }];
		const xml = generateSitemap(pages, 'https://example.com');

		expect(xml).toContain('<priority>0.8</priority>');
	});

	it('should assign priority 0.6 to deep pages', () => {
		const pages: SitemapEntry[] = [{ url: '/docs/guides/setup', draft: false }];
		const xml = generateSitemap(pages, 'https://example.com');

		expect(xml).toContain('<priority>0.6</priority>');
	});

	it('should exclude draft pages', () => {
		const pages: SitemapEntry[] = [
			{ url: '/', draft: false },
			{ url: '/secret', draft: true },
		];

		const xml = generateSitemap(pages, 'https://example.com');

		expect(xml).toContain('<loc>https://example.com/</loc>');
		expect(xml).not.toContain('/secret');
	});

	it('should strip trailing slash from baseUrl', () => {
		const pages: SitemapEntry[] = [{ url: '/about', draft: false }];
		const xml = generateSitemap(pages, 'https://example.com/');

		expect(xml).toContain('<loc>https://example.com/about</loc>');
	});

	it('should escape XML special characters in URLs', () => {
		const pages: SitemapEntry[] = [{ url: '/search?q=a&b=c', draft: false }];
		const xml = generateSitemap(pages, 'https://example.com');

		expect(xml).toContain('&amp;');
		expect(xml).not.toContain('&b=');
	});
});
