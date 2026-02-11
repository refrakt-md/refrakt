<script lang="ts">
	import { Renderer, setRegistry } from '@refract-md/svelte';
	import { setContext } from 'svelte';
	import { registry } from '../registry.js';

	interface PageEntry {
		url: string;
		title: string;
		draft: boolean;
	}

	let { title, description, regions, renderable, pages }: {
		title: string;
		description: string;
		regions: Record<string, { name: string; mode: string; content: any[] }>;
		renderable: any;
		pages: PageEntry[];
	} = $props();

	// Wire up theme components and page index into Svelte context
	setRegistry(registry);
	setContext('pages', pages);

	const hasNav = !!regions.nav;
</script>

<svelte:head>
	{#if title}
		<title>{title}</title>
	{/if}
	{#if description}
		<meta name="description" content={description} />
	{/if}
</svelte:head>

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
		padding: 0.75rem 0;
	}
	.site-header :global(h1) {
		font-size: 1.1rem;
		margin: 0;
		font-weight: 700;
		letter-spacing: -0.01em;
	}
	.site-header :global(a) {
		color: inherit;
		text-decoration: none;
	}
	.page-layout {
		padding-top: 2rem;
		padding-bottom: 4rem;
	}
	.page-layout.has-nav {
		display: grid;
		grid-template-columns: 220px 1fr;
		gap: 3rem;
	}
	.sidebar {
		position: sticky;
		top: 1rem;
		align-self: start;
	}
	.page-content {
		min-width: 0;
		max-width: 48rem;
	}
	.sidebar-right {
		grid-column: 2;
	}

	@media (max-width: 768px) {
		.page-layout.has-nav {
			grid-template-columns: 1fr;
		}
		.sidebar {
			position: static;
		}
	}
</style>
