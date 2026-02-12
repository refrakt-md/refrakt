<script lang="ts">
	import { Renderer } from '@refrakt-md/svelte';

	let { regions, renderable }: {
		title: string;
		description: string;
		regions: Record<string, { name: string; mode: string; content: any[] }>;
		renderable: any;
		pages: any[];
	} = $props();
</script>

{#if regions.header}
	<header class="site-header">
		<Renderer node={regions.header.content} />
	</header>
{/if}

<main class="page-content">
	<Renderer node={renderable} />
</main>

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
	.page-content {
		padding-top: 2.5rem;
		padding-bottom: 4rem;
		max-width: 64rem;
	}
</style>
