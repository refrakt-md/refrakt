<script lang="ts">
	import Renderer from '$lib/renderer/Renderer.svelte';

	let { data } = $props();
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

<div class="page-layout">
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
		border-bottom: 1px solid #e5e7eb;
		padding: 1rem 0;
		margin-bottom: 2rem;
	}
	.page-layout {
		display: grid;
		grid-template-columns: 240px 1fr;
		gap: 3rem;
	}
	.sidebar {
		position: sticky;
		top: 1rem;
		align-self: start;
	}
	.page-content {
		min-width: 0;
	}
	.sidebar-right {
		grid-column: 2;
	}

	@media (max-width: 768px) {
		.page-layout {
			grid-template-columns: 1fr;
		}
		.sidebar {
			position: static;
		}
	}
</style>
