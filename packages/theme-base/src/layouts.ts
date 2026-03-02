import type { LayoutConfig, LayoutStructureEntry } from '@refrakt-md/transform';

// ─── Shared SVG Icons ─────────────────────────────────────────────────

const MENU_DOTS_SVG = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/></svg>';

const CLOSE_X_SVG = '<svg width="20" height="20" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2" fill="none"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg>';

const HAMBURGER_SVG = '<svg width="20" height="20" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2" fill="none"><line x1="3" y1="5" x2="17" y2="5"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="15" x2="17" y2="15"/></svg>';

// ─── Shared Chrome ────────────────────────────────────────────────────

const menuButton: LayoutStructureEntry = {
	tag: 'button',
	ref: 'mobile-menu-btn',
	attrs: {
		class: 'rf-mobile-menu-btn',
		'aria-label': 'Open menu',
		'data-mobile-menu-open': '',
	},
	svg: MENU_DOTS_SVG,
};

const closeButton: LayoutStructureEntry = {
	tag: 'button',
	ref: 'mobile-panel-close',
	attrs: {
		class: 'rf-mobile-panel__close',
		'aria-label': 'Close menu',
		'data-mobile-menu-close': '',
	},
	svg: CLOSE_X_SVG,
};

// ─── Default Layout ───────────────────────────────────────────────────
// Matches DefaultLayout.svelte: header + mobile panel + main content

export const defaultLayout: LayoutConfig = {
	block: 'default',
	behaviors: ['mobile-menu'],
	chrome: {
		menuButton,
		closeButton,
	},
	slots: {
		header: {
			tag: 'header',
			class: 'rf-header',
			conditionalRegion: 'header',
			children: [
				{
					tag: 'div',
					class: 'rf-header__inner',
					source: 'region:header',
					children: ['chrome:menuButton'],
				},
			],
		},
		mobilePanel: {
			tag: 'div',
			class: 'rf-mobile-panel',
			conditionalRegion: 'header',
			attrs: { role: 'dialog', 'aria-label': 'Navigation menu' },
			children: [
				{
					tag: 'div',
					class: 'rf-mobile-panel__header',
					children: [
						{
							tag: 'span',
							ref: 'mobile-panel-title',
							attrs: { class: 'rf-mobile-panel__title' },
							children: ['Menu'],
						} as LayoutStructureEntry,
						'chrome:closeButton',
					],
				},
				{
					tag: 'nav',
					class: 'rf-mobile-panel__nav',
					source: 'clone:region:header',
				},
			],
		},
		main: {
			tag: 'main',
			class: 'rf-page-content',
			source: 'content',
		},
	},
};

// ─── Docs Layout ──────────────────────────────────────────────────────
// Matches DocsLayout.svelte: header + mobile panels + toolbar + sidebar + content with TOC

export const docsLayout: LayoutConfig = {
	block: 'docs',
	behaviors: ['mobile-menu'],
	computed: {
		breadcrumb: {
			type: 'breadcrumb',
			source: 'region:nav',
		},
		toc: {
			type: 'toc',
			source: 'headings',
			options: { minLevel: 2, maxLevel: 3 },
			visibility: {
				minCount: 2,
				frontmatterToggle: 'toc',
			},
		},
		'version-switcher': {
			type: 'version-switcher',
			source: 'frontmatter',
		},
	},
	chrome: {
		menuButton,
		closeButton,
		hamburger: {
			tag: 'button',
			ref: 'toolbar-hamburger',
			attrs: {
				class: 'rf-docs-toolbar__hamburger',
				'aria-label': 'Toggle navigation',
				'data-mobile-nav-toggle': '',
			},
			svg: HAMBURGER_SVG,
		},
	},
	slots: {
		header: {
			tag: 'header',
			class: 'rf-docs-header',
			conditionalRegion: 'header',
			children: [
				{
					tag: 'div',
					class: 'rf-docs-header__inner',
					source: 'region:header',
					children: ['chrome:menuButton'],
				},
			],
		},
		mobilePanel: {
			tag: 'div',
			class: 'rf-mobile-panel',
			conditionalRegion: 'header',
			attrs: { role: 'dialog', 'aria-label': 'Navigation menu' },
			children: [
				{
					tag: 'div',
					class: 'rf-mobile-panel__header',
					children: [
						{
							tag: 'span',
							ref: 'mobile-panel-title',
							attrs: { class: 'rf-mobile-panel__title' },
							children: ['Menu'],
						} as LayoutStructureEntry,
						'chrome:closeButton',
					],
				},
				{
					tag: 'nav',
					class: 'rf-mobile-panel__nav',
					source: 'clone:region:header',
				},
			],
		},
		toolbar: {
			tag: 'div',
			class: 'rf-docs-toolbar',
			conditionalRegion: 'nav',
			children: [
				'chrome:hamburger',
				{
					tag: 'div',
					source: 'computed:breadcrumb',
				},
			],
		},
		mobileNavPanel: {
			tag: 'div',
			class: 'rf-mobile-panel rf-mobile-panel--nav',
			conditionalRegion: 'nav',
			attrs: { role: 'dialog', 'aria-label': 'Page navigation' },
			children: [
				{
					tag: 'div',
					class: 'rf-mobile-panel__body',
					source: 'region:nav',
				},
			],
		},
		sidebar: {
			tag: 'aside',
			class: 'rf-docs-sidebar',
			source: 'region:nav',
			conditional: true,
		},
		main: {
			tag: 'main',
			class: 'rf-docs-content',
			conditionalModifier: { region: 'nav', modifier: 'has-nav' },
			wrapper: {
				tag: 'div',
				class: 'rf-docs-content__inner',
				conditionalModifier: { computed: 'toc', modifier: 'has-toc' },
			},
			children: [
				{
					tag: 'div',
					class: 'rf-docs-content__body',
					children: [
						{
							tag: 'div',
							source: 'computed:version-switcher',
							conditional: true,
						},
						{
							tag: 'div',
							source: 'content',
						},
					],
				},
				{
					tag: 'aside',
					class: 'rf-docs-toc',
					source: 'computed:toc',
					conditional: true,
				},
			],
		},
	},
};

// ─── Blog Article Layout ──────────────────────────────────────────────
// Matches BlogLayout.svelte article mode (individual post with frontmatter chrome).
// Blog index mode is handled by a {% blog-index %} rune, not by the layout.

export const blogArticleLayout: LayoutConfig = {
	block: 'blog-article',
	behaviors: ['mobile-menu'],
	chrome: {
		menuButton,
		closeButton,
		articleHeader: {
			tag: 'header',
			ref: 'article-header',
			attrs: { class: 'rf-blog-article__header' },
			children: [
				{
					tag: 'h1',
					ref: 'title',
					attrs: { class: 'rf-blog-article__title' },
					pageText: 'title',
				} as LayoutStructureEntry,
				{
					tag: 'div',
					ref: 'meta',
					attrs: { class: 'rf-blog-article__meta' },
					pageCondition: 'frontmatter.date',
					children: [
						{
							tag: 'time',
							ref: 'date',
							pageText: 'frontmatter.date',
							dateFormat: { year: 'numeric', month: 'long', day: 'numeric' },
							attrs: { datetime: { fromPageData: 'frontmatter.date' } },
						} as LayoutStructureEntry,
						{
							tag: 'span',
							ref: 'author',
							attrs: { class: 'rf-blog-article__author' },
							pageText: 'frontmatter.author',
							pageCondition: 'frontmatter.author',
						} as LayoutStructureEntry,
					],
				} as LayoutStructureEntry,
				{
					tag: 'div',
					ref: 'tags',
					attrs: { class: 'rf-blog-article__tags' },
					pageCondition: 'frontmatter.tags',
					iterate: { source: 'frontmatter.tags', tag: 'span', class: 'rf-blog-article__tag' },
				} as LayoutStructureEntry,
			],
		},
	},
	slots: {
		header: {
			tag: 'header',
			class: 'rf-blog-header',
			conditionalRegion: 'header',
			children: [
				{
					tag: 'div',
					class: 'rf-blog-header__inner',
					source: 'region:header',
					children: ['chrome:menuButton'],
				},
			],
		},
		mobilePanel: {
			tag: 'div',
			class: 'rf-mobile-panel',
			conditionalRegion: 'header',
			attrs: { role: 'dialog', 'aria-label': 'Navigation menu' },
			children: [
				{
					tag: 'div',
					class: 'rf-mobile-panel__header',
					children: [
						{
							tag: 'span',
							ref: 'mobile-panel-title',
							attrs: { class: 'rf-mobile-panel__title' },
							children: ['Menu'],
						} as LayoutStructureEntry,
						'chrome:closeButton',
					],
				},
				{
					tag: 'nav',
					class: 'rf-mobile-panel__nav',
					source: 'clone:region:header',
				},
			],
		},
		blog: {
			tag: 'div',
			class: 'rf-blog',
			conditionalModifier: { region: 'sidebar', modifier: 'has-sidebar' },
			children: [
				{
					tag: 'article',
					class: 'rf-blog-article',
					children: [
						'chrome:articleHeader',
						{
							tag: 'div',
							class: 'rf-blog-article__body',
							source: 'content',
						},
					],
				},
				{
					tag: 'aside',
					class: 'rf-blog-sidebar',
					source: 'region:sidebar',
					conditional: true,
				},
			],
		},
		footer: {
			tag: 'footer',
			class: 'rf-blog-footer',
			source: 'region:footer',
			conditional: true,
		},
	},
};
