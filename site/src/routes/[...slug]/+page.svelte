<script lang="ts">
	import Renderer from '$lib/renderer/Renderer.svelte';
	import { setContext } from 'svelte';

	let { data } = $props();

	setContext('pages', data.pages);

	const hasNav = !!data.regions.nav;
</script>

<svelte:head>
	{#if data.title}
		<title>{data.title}</title>
	{/if}
	{#if data.description}
		<meta name="description" content={data.description} />
	{/if}
</svelte:head>

{#if data.regions.header}
	<header class="site-header">
		<Renderer node={data.regions.header.content} />
	</header>
{/if}

<div class="page-layout" class:has-nav={hasNav}>
	{#if data.regions.nav}
		<aside class="sidebar">
			<Renderer node={data.regions.nav.content} />
		</aside>
	{/if}

	<main class="page-content">
		<Renderer node={data.renderable} />
	</main>

	{#if data.regions.sidebar}
		<aside class="sidebar-right">
			<Renderer node={data.regions.sidebar.content} />
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
