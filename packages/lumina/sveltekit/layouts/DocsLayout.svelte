<script lang="ts">
	import { Renderer } from '@refrakt-md/svelte';

	let { title, regions, renderable, url, pages }: {
		title: string;
		description: string;
		regions: Record<string, { name: string; mode: string; content: any[] }>;
		renderable: any;
		url: string;
		pages: Array<{ url: string; title: string; draft: boolean }>;
	} = $props();

	const hasNav = $derived(!!regions.nav);

	// Mobile panel state
	let menuOpen = $state(false);
	let navOpen = $state(false);

	// Breadcrumb: derive category from URL segments after /docs/
	const breadcrumb = $derived(() => {
		const segments = (url || '').replace(/^\//, '').split('/');
		// segments: ['docs', 'runes', 'breadcrumb'] or ['docs', 'getting-started']
		if (segments.length <= 1) return { category: '', page: title };
		// Skip 'docs', take first segment after as category
		const category = segments[1] ? segments[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';
		if (segments.length <= 2) return { category: '', page: title };
		return { category, page: title };
	});

	function closeMenu() { menuOpen = false; }
	function closeNav() { navOpen = false; }

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			menuOpen = false;
			navOpen = false;
		}
	}

	// Close panels on navigation
	$effect(() => {
		url;
		menuOpen = false;
		navOpen = false;
	});
</script>

<svelte:window onkeydown={onKeydown} />

{#if regions.header}
	<header class="site-header">
		<div class="site-header-inner">
			<Renderer node={regions.header.content} />
			<button class="mobile-menu-btn" onclick={() => menuOpen = true} aria-label="Open menu">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
					<circle cx="10" cy="4" r="1.5"/>
					<circle cx="10" cy="10" r="1.5"/>
					<circle cx="10" cy="16" r="1.5"/>
				</svg>
			</button>
		</div>
	</header>
{/if}

<!-- Mobile header menu panel -->
{#if menuOpen}
	<div class="mobile-panel" role="dialog" aria-label="Navigation menu">
		<div class="mobile-panel-header">
			<span class="mobile-panel-title">Menu</span>
			<button class="mobile-panel-close" onclick={closeMenu} aria-label="Close menu">
				<svg width="20" height="20" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2" fill="none">
					<line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/>
				</svg>
			</button>
		</div>
		<nav class="mobile-panel-nav">
			{#if regions.header}
				<Renderer node={regions.header.content} />
			{/if}
		</nav>
	</div>
{/if}

<!-- Mobile docs toolbar with hamburger + breadcrumbs -->
{#if hasNav}
	<div class="mobile-toolbar">
		<button class="mobile-toolbar-hamburger" onclick={() => navOpen = true} aria-label="Open navigation">
			<svg width="20" height="20" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2" fill="none">
				<line x1="3" y1="5" x2="17" y2="5"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="15" x2="17" y2="15"/>
			</svg>
		</button>
		<div class="mobile-toolbar-breadcrumb">
			{#if breadcrumb().category}
				<span class="breadcrumb-category">{breadcrumb().category}</span>
				<span class="breadcrumb-sep">&rsaquo;</span>
			{/if}
			<span class="breadcrumb-page">{breadcrumb().page}</span>
		</div>
	</div>
{/if}

<!-- Mobile nav panel -->
{#if navOpen}
	<div class="mobile-panel" role="dialog" aria-label="Page navigation">
		<div class="mobile-panel-header">
			<span class="mobile-panel-title">Navigation</span>
			<button class="mobile-panel-close" onclick={closeNav} aria-label="Close navigation">
				<svg width="20" height="20" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2" fill="none">
					<line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/>
				</svg>
			</button>
		</div>
		<div class="mobile-panel-body">
			{#if regions.nav}
				<Renderer node={regions.nav.content} />
			{/if}
		</div>
	</div>
{/if}

{#if regions.nav}
	<aside class="sidebar">
		<Renderer node={regions.nav.content} />
	</aside>
{/if}

<main class="page-content" class:has-nav={hasNav}>
	<div class="page-content-inner">
		<Renderer node={renderable} />
	</div>
</main>

<style>
	/* ---- Fixed header ---- */
	.site-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 10;
		background: var(--color-bg, #fff);
		border-bottom: 1px solid var(--color-border);
	}
	.site-header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1.5rem;
	}
	.site-header :global(p) {
		margin: 0;
		line-height: 1;
	}
	.site-header :global(a) {
		display: inline-block;
		color: inherit;
		text-decoration: none;
	}
	.site-header :global(a:hover) {
		text-decoration: none;
	}
	.site-header :global(img) {
		display: block;
		height: 1.5rem;
		width: auto;
	}
	.site-header-inner :global(p:last-child:not(:first-child)) {
		font-size: 0.85rem;
	}
	.site-header-inner :global(p:last-child:not(:first-child) a) {
		margin-left: 1.5rem;
		color: var(--color-muted);
	}
	.site-header-inner :global(p:last-child:not(:first-child) a:hover) {
		color: var(--color-text);
	}

	/* ---- Fixed sidebar ---- */
	.sidebar {
		position: fixed;
		left: 0;
		top: 3.375rem; /* header height */
		bottom: 0;
		width: 240px;
		overflow-y: auto;
		padding: 1.5rem;
		border-right: 1px solid var(--color-border);
		background: var(--color-bg, #fff);
		z-index: 5;
	}
	.sidebar::-webkit-scrollbar {
		width: 0;
	}

	/* ---- Content area ---- */
	.page-content {
		padding-top: 5rem; /* clears fixed header */
		padding-bottom: 4rem;
	}
	.page-content.has-nav {
		margin-left: 240px;
	}
	.page-content-inner {
		max-width: 60rem;
		margin: 0 auto;
		padding: 0 2.5rem;
	}

	/* ---- Mobile menu button (hidden on desktop) ---- */
	.mobile-menu-btn {
		display: none;
		background: none;
		border: none;
		padding: 0.25rem;
		cursor: pointer;
		color: var(--color-muted);
		line-height: 0;
	}
	.mobile-menu-btn:hover {
		color: var(--color-text);
	}

	/* ---- Mobile toolbar (hidden on desktop) ---- */
	.mobile-toolbar {
		display: none;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 1rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-bg, #fff);
	}
	.mobile-toolbar-hamburger {
		background: none;
		border: none;
		padding: 0.25rem;
		cursor: pointer;
		color: var(--color-muted);
		line-height: 0;
		flex-shrink: 0;
	}
	.mobile-toolbar-hamburger:hover {
		color: var(--color-text);
	}
	.mobile-toolbar-breadcrumb {
		font-size: 0.8rem;
		color: var(--color-muted);
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.breadcrumb-category {
		color: var(--color-muted);
	}
	.breadcrumb-sep {
		margin: 0 0.35rem;
		color: var(--color-border);
	}
	.breadcrumb-page {
		color: var(--color-text);
		font-weight: 500;
	}

	/* ---- Mobile fullscreen panels ---- */
	.mobile-panel {
		display: none;
		position: fixed;
		inset: 0;
		z-index: 100;
		background: var(--color-bg, #fff);
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}
	.mobile-panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}
	.mobile-panel-title {
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-muted);
	}
	.mobile-panel-close {
		background: none;
		border: none;
		padding: 0.25rem;
		cursor: pointer;
		color: var(--color-muted);
		line-height: 0;
	}
	.mobile-panel-close:hover {
		color: var(--color-text);
	}
	.mobile-panel-nav {
		padding: 1.5rem;
	}
	.mobile-panel-nav :global(p) {
		margin: 0;
	}
	.mobile-panel-nav :global(img) {
		display: none;
	}
	.mobile-panel-nav :global(a) {
		display: block;
		padding: 0.75rem 0;
		font-size: 1.1rem;
		color: var(--color-text);
		text-decoration: none;
		border-bottom: 1px solid var(--color-border);
	}
	.mobile-panel-nav :global(a:hover) {
		color: var(--color-primary, var(--color-text));
		text-decoration: none;
	}
	.mobile-panel-body {
		padding: 1rem 1.5rem;
	}

	/* ---- Mobile overrides ---- */
	@media (max-width: 768px) {
		.site-header {
			position: static;
		}
		/* Hide desktop nav links in header */
		.site-header-inner :global(p:last-child:not(:first-child)) {
			display: none;
		}
		/* Show mobile menu button */
		.mobile-menu-btn {
			display: block;
		}
		/* Show mobile panels when open */
		.mobile-panel {
			display: block;
		}
		/* Show mobile toolbar on docs pages */
		.mobile-toolbar {
			display: flex;
		}
		/* Hide desktop sidebar */
		.sidebar {
			display: none;
		}
		.page-content {
			padding-top: 2rem;
		}
		.page-content.has-nav {
			margin-left: 0;
		}
		.page-content-inner {
			padding: 0 1.5rem;
		}
	}
</style>
