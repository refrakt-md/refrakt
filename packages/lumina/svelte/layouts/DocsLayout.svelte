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

	// Helpers to walk the serialized nav tree (same patterns as Nav.svelte)
	function isTag(node: any): node is { $$mdtype: 'Tag'; name: string; attributes: Record<string, any>; children: any[] } {
		return node !== null && typeof node === 'object' && !Array.isArray(node) && node.$$mdtype === 'Tag';
	}

	function getTextContent(node: any): string {
		if (typeof node === 'string') return node;
		if (typeof node === 'number') return String(node);
		if (isTag(node)) return node.children.map(getTextContent).join('');
		if (Array.isArray(node)) return node.map(getTextContent).join('');
		return '';
	}

	// Build slug → group title map from nav region
	function buildNavMap(content: any[]): Map<string, string> {
		const map = new Map<string, string>();
		function walk(nodes: any[], groupTitle: string) {
			for (const node of nodes) {
				if (!isTag(node)) continue;
				if (node.attributes.typeof === 'NavGroup') {
					const heading = node.children.find((c: any) => isTag(c) && /^h[1-6]$/.test(c.name));
					walk(node.children, heading ? getTextContent(heading) : '');
				} else if (node.attributes.typeof === 'NavItem') {
					const slugSpan = node.children.find((c: any) => isTag(c) && c.name === 'span' && c.attributes.property === 'slug');
					if (slugSpan && groupTitle) map.set(getTextContent(slugSpan), groupTitle);
				} else if (node.children) {
					walk(node.children, groupTitle);
				}
			}
		}
		walk(content, '');
		return map;
	}

	// Breadcrumb: look up current page slug in nav group headings
	const pageSlug = $derived((url || '').split('/').filter(Boolean).pop() || '');
	const navMap = $derived(regions.nav ? buildNavMap(regions.nav.content) : new Map());
	const breadcrumbCategory = $derived(navMap.get(pageSlug) || '');

	function closeMenu() { menuOpen = false; }

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

	// Lock body scroll when a panel is open
	$effect(() => {
		document.body.style.overflow = (menuOpen || navOpen) ? 'hidden' : '';
	});
</script>

<svelte:window onkeydown={onKeydown} />

{#if regions.header}
	<header class="rf-docs-header">
		<div class="rf-docs-header__inner">
			<Renderer node={regions.header.content} />
			<button class="rf-mobile-menu-btn" onclick={() => { navOpen = false; menuOpen = true; }} aria-label="Open menu">
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
	<div class="rf-mobile-panel" role="dialog" aria-label="Navigation menu">
		<div class="rf-mobile-panel__header">
			<span class="rf-mobile-panel__title">Menu</span>
			<button class="rf-mobile-panel__close" onclick={closeMenu} aria-label="Close menu">
				<svg width="20" height="20" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2" fill="none">
					<line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/>
				</svg>
			</button>
		</div>
		<nav class="rf-mobile-panel__nav">
			{#if regions.header}
				<Renderer node={regions.header.content} />
			{/if}
		</nav>
	</div>
{/if}

<!-- Mobile docs toolbar with hamburger + breadcrumbs -->
{#if hasNav}
	<div class="rf-docs-toolbar">
		<button class="rf-docs-toolbar__hamburger" onclick={() => { menuOpen = false; navOpen = !navOpen; }} aria-label="Toggle navigation">
			<svg width="20" height="20" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2" fill="none">
				<line x1="3" y1="5" x2="17" y2="5"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="15" x2="17" y2="15"/>
			</svg>
		</button>
		<div class="rf-docs-toolbar__breadcrumb">
			{#if breadcrumbCategory}
				<span class="rf-docs-breadcrumb-category">{breadcrumbCategory}</span>
				<span class="rf-docs-breadcrumb-sep">&rsaquo;</span>
			{/if}
			<span class="rf-docs-breadcrumb-page">{title}</span>
		</div>
	</div>
{/if}

<!-- Mobile nav panel -->
{#if navOpen}
	<div class="rf-mobile-panel rf-mobile-panel--nav" role="dialog" aria-label="Page navigation">
		<div class="rf-mobile-panel__body">
			{#if regions.nav}
				<Renderer node={regions.nav.content} />
			{/if}
		</div>
	</div>
{/if}

{#if regions.nav}
	<aside class="rf-docs-sidebar">
		<Renderer node={regions.nav.content} />
	</aside>
{/if}

<main class="rf-docs-content" class:rf-docs-content--has-nav={hasNav}>
	<div class="rf-docs-content__inner">
		<Renderer node={renderable} />
	</div>
</main>
