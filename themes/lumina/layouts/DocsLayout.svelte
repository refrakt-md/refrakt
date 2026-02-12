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
		<Renderer node={regions.header.content} />
	</header>
{/if}

<div class="page-layout" class:has-nav={hasNav}>
	{#if regions.nav}
		<aside class="sidebar">
			<Renderer node={regions.nav.content} />
		</aside>
	{/if}

	<main class="page-content">
		<Renderer node={renderable} />
	</main>

	{#if regions.sidebar}
		<aside class="sidebar-right">
			<Renderer node={regions.sidebar.content} />
		</aside>
	{/if}
</div>

<style>
	.site-header {
		border-bottom: 1px solid var(--color-border);
		padding: 0.875rem 0;
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
	.page-layout {
		padding-top: 2rem;
		padding-bottom: 4rem;
	}
	.page-layout.has-nav {
		display: grid;
		grid-template-columns: 240px 1fr;
		gap: 1px;
	}
	.sidebar {
		position: sticky;
		top: 1rem;
		align-self: start;
		padding-right: 1.5rem;
		border-right: 1px solid var(--color-border);
		max-height: calc(100vh - 2rem);
		overflow-y: auto;
	}
	.sidebar::-webkit-scrollbar {
		width: 0;
	}
	.page-content {
		min-width: 0;
		max-width: 52rem;
		padding-left: 2.5rem;
	}
	.sidebar-right {
		grid-column: 2;
	}

	@media (max-width: 768px) {
		.page-layout.has-nav {
			grid-template-columns: 1fr;
			gap: 0;
		}
		.sidebar {
			position: static;
			border-right: none;
			border-bottom: 1px solid var(--color-border);
			padding-right: 0;
			padding-bottom: 1rem;
			margin-bottom: 1.5rem;
			max-height: none;
		}
		.page-content {
			padding-left: 0;
		}
	}
</style>
