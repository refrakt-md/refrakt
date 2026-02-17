<script lang="ts">
	import { Renderer } from '@refrakt-md/svelte';

	let { regions, renderable, url }: {
		title: string;
		description: string;
		regions: Record<string, { name: string; mode: string; content: any[] }>;
		renderable: any;
		url: string;
		pages: any[];
	} = $props();

	let menuOpen = $state(false);

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') menuOpen = false;
	}

	$effect(() => {
		url;
		menuOpen = false;
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

{#if menuOpen}
	<div class="mobile-panel" role="dialog" aria-label="Navigation menu">
		<div class="mobile-panel-header">
			<span class="mobile-panel-title">Menu</span>
			<button class="mobile-panel-close" onclick={() => menuOpen = false} aria-label="Close menu">
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

<main class="page-content">
	<Renderer node={renderable} />
</main>

<style>
	.site-header {
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
	.page-content {
		padding-top: 2.5rem;
		padding-bottom: 4rem;
		max-width: 64rem;
		margin: 0 auto;
		padding-left: 1.5rem;
		padding-right: 1.5rem;
	}

	/* ---- Mobile menu button ---- */
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

	/* ---- Mobile panel ---- */
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

	@media (max-width: 768px) {
		.site-header-inner :global(p:last-child:not(:first-child)) {
			display: none;
		}
		.mobile-menu-btn {
			display: block;
		}
		.mobile-panel {
			display: block;
		}
	}
</style>
