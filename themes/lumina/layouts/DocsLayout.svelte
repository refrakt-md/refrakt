<script lang="ts">
	import { Renderer } from '@refract-md/svelte';

	let { regions, renderable }: {
		title: string;
		description: string;
		regions: Record<string, { name: string; mode: string; content: any[] }>;
		renderable: any;
		pages: any[];
	} = $props();

	const hasNav = !!regions.nav;
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
	.site-header :global(h1) {
		font-size: 1.05rem;
		margin: 0;
		font-weight: 700;
		letter-spacing: -0.01em;
	}
	.site-header :global(a) {
		color: inherit;
		text-decoration: none;
	}
	.site-header :global(a:hover) {
		text-decoration: none;
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
		max-width: 48rem;
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
