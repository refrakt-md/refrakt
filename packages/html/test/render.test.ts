import { describe, it, expect } from 'vitest';
import { makeTag } from '@refrakt-md/transform';
import { renderPage, renderFullPage, applyHtmlTransforms } from '../src/index.js';
import type { HtmlTheme, RenderPageInput } from '../src/index.js';
import type { LayoutPageData } from '@refrakt-md/transform';

// Minimal layout config for testing
const testLayout = {
	block: 'test',
	slots: {
		content: {
			tag: 'main',
			source: 'content',
		},
	},
};

function makeTheme(overrides: Partial<HtmlTheme> = {}): HtmlTheme {
	return {
		manifest: {
			name: 'Test',
			version: '1.0.0',
			target: 'html',
			designTokens: 'tokens.css',
			layouts: {},
			components: {},
			routeRules: [],
		},
		layouts: {
			default: testLayout as any,
		},
		...overrides,
	};
}

function makePageData(overrides: Partial<LayoutPageData> = {}): LayoutPageData {
	return {
		renderable: makeTag('p', {}, ['Hello world']),
		regions: {},
		title: 'Test Page',
		url: '/test',
		pages: [],
		frontmatter: {},
		...overrides,
	};
}

describe('applyHtmlTransforms', () => {
	it('wraps <table> elements in a .rf-table-wrapper div', () => {
		const table = makeTag('table', { class: 'data' }, [
			makeTag('tr', {}, [
				makeTag('td', {}, ['Cell']),
			]),
		]);
		const result = applyHtmlTransforms(table) as any;

		expect(result.name).toBe('div');
		expect(result.attributes.class).toBe('rf-table-wrapper');
		expect(result.children).toHaveLength(1);
		expect(result.children[0].name).toBe('table');
		expect(result.children[0].attributes.class).toBe('data');
	});

	it('does not wrap non-table elements', () => {
		const div = makeTag('div', { class: 'content' }, [
			makeTag('p', {}, ['Text']),
		]);
		const result = applyHtmlTransforms(div) as any;

		expect(result.name).toBe('div');
		expect(result.attributes.class).toBe('content');
	});

	it('recursively transforms nested tables', () => {
		const tree = makeTag('div', {}, [
			makeTag('table', {}, [
				makeTag('tr', {}, [makeTag('td', {}, ['A'])]),
			]),
		]);
		const result = applyHtmlTransforms(tree) as any;

		// The div should contain a wrapper div, not a bare table
		expect(result.children[0].name).toBe('div');
		expect(result.children[0].attributes.class).toBe('rf-table-wrapper');
		expect(result.children[0].children[0].name).toBe('table');
	});

	it('passes through string nodes unchanged', () => {
		expect(applyHtmlTransforms('text' as any)).toBe('text');
	});

	it('passes through null nodes', () => {
		expect(applyHtmlTransforms(null as any)).toBeNull();
	});
});

describe('renderPage', () => {
	it('renders page content with layout', () => {
		const theme = makeTheme();
		const page = makePageData();
		const html = renderPage({ theme, page });

		// Should produce HTML containing our content
		expect(html).toContain('Hello world');
		// Should be wrapped in a layout structure
		expect(html).toContain('<main');
	});

	it('renders bare content when no layout matches', () => {
		const theme = makeTheme({ layouts: {} });
		const page = makePageData();
		const html = renderPage({ theme, page });

		expect(html).toContain('<p>Hello world</p>');
	});

	it('wraps tables in output', () => {
		const theme = makeTheme({ layouts: {} });
		const page = makePageData({
			renderable: makeTag('table', {}, [
				makeTag('tr', {}, [makeTag('td', {}, ['Cell'])]),
			]),
		});
		const html = renderPage({ theme, page });

		expect(html).toContain('rf-table-wrapper');
		expect(html).toContain('<table>');
	});
});

describe('renderFullPage', () => {
	it('produces a complete HTML document', () => {
		const theme = makeTheme({ layouts: {} });
		const page = makePageData();
		const html = renderFullPage({ theme, page });

		expect(html).toContain('<!DOCTYPE html>');
		expect(html).toContain('<html lang="en">');
		expect(html).toContain('<head>');
		expect(html).toContain('</head>');
		expect(html).toContain('<body>');
		expect(html).toContain('</body>');
		expect(html).toContain('</html>');
	});

	it('includes title from page data', () => {
		const theme = makeTheme({ layouts: {} });
		const page = makePageData({ title: 'My Page' });
		const html = renderFullPage({ theme, page });

		expect(html).toContain('<title>My Page</title>');
	});

	it('includes SEO meta tags when provided', () => {
		const theme = makeTheme({ layouts: {} });
		const page = makePageData();
		const seo = {
			og: {
				title: 'OG Title',
				description: 'OG Description',
				image: '/img/og.jpg',
				type: 'article',
				url: 'https://example.com/test',
			},
			jsonLd: [{ '@type': 'Article', name: 'Test' }],
		};
		const html = renderFullPage({ theme, page }, { seo });

		expect(html).toContain('<title>OG Title</title>');
		expect(html).toContain('og:title');
		expect(html).toContain('og:description');
		expect(html).toContain('og:image');
		expect(html).toContain('og:type');
		expect(html).toContain('og:url');
		expect(html).toContain('twitter:card');
		expect(html).toContain('application/ld+json');
		expect(html).toContain('"@type":"Article"');
	});

	it('includes stylesheet links', () => {
		const theme = makeTheme({ layouts: {} });
		const page = makePageData();
		const html = renderFullPage({ theme, page }, {
			stylesheets: ['/css/theme.css', '/css/custom.css'],
		});

		expect(html).toContain('<link rel="stylesheet" href="/css/theme.css">');
		expect(html).toContain('<link rel="stylesheet" href="/css/custom.css">');
	});

	it('includes script tags', () => {
		const theme = makeTheme({ layouts: {} });
		const page = makePageData();
		const html = renderFullPage({ theme, page }, {
			scripts: ['/js/behaviors.js'],
		});

		expect(html).toContain('<script src="/js/behaviors.js"></script>');
	});

	it('includes context data script for client-side hydration', () => {
		const theme = makeTheme({ layouts: {} });
		const page = makePageData({ url: '/docs/intro' });
		const html = renderFullPage({ theme, page });

		expect(html).toContain('id="rf-context"');
		expect(html).toContain('"currentUrl":"/docs/intro"');
	});

	it('supports custom lang attribute', () => {
		const theme = makeTheme({ layouts: {} });
		const page = makePageData();
		const html = renderFullPage({ theme, page }, { lang: 'fr' });

		expect(html).toContain('<html lang="fr">');
	});

	it('includes extra head content', () => {
		const theme = makeTheme({ layouts: {} });
		const page = makePageData();
		const html = renderFullPage({ theme, page }, {
			headExtra: '<link rel="icon" href="/favicon.ico">',
		});

		expect(html).toContain('<link rel="icon" href="/favicon.ico">');
	});

	it('escapes HTML in title', () => {
		const theme = makeTheme({ layouts: {} });
		const page = makePageData({ title: 'A <script> & "test"' });
		const html = renderFullPage({ theme, page });

		expect(html).toContain('<title>A &lt;script&gt; &amp; &quot;test&quot;</title>');
		expect(html).not.toContain('<title>A <script>');
	});
});
