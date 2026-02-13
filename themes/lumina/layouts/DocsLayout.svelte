<script lang="ts">
	import { Renderer } from '@refrakt-md/svelte';

	let { regions, renderable }: {
		title: string;
		description: string;
		regions: Record<string, { name: string; mode: string; content: any[] }>;
		renderable: any;
		pages: any[];
	} = $props();

	const hasNav = $derived(!!regions.nav);
</script>

{#if regions.header}
	<header class="site-header">
		<div class="site-header-inner">
			<Renderer node={regions.header.content} />
		</div>
	</header>
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

	/* ---- Mobile ---- */
	@media (max-width: 768px) {
		.site-header {
			position: static;
		}
		.sidebar {
			position: static;
			width: auto;
			border-right: none;
			border-bottom: 1px solid var(--color-border);
			padding: 1rem 1.5rem;
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
