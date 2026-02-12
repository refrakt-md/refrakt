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
	.page-content {
		padding-top: 2.5rem;
		padding-bottom: 4rem;
		max-width: 56rem;
	}
</style>
